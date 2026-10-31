/**
 * Dropp Seller API client
 * ───────────────────────
 * - Persists accessToken + refreshToken (+ user) in AsyncStorage
 * - On a 401 it calls /api/auth/refresh once (shared across concurrent calls) and retries
 * - Never throws a JSON parse error: non-JSON responses become a readable ApiError
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../../../shared/utils/apiConfig';

const STORAGE_KEY = '@dropp_seller/session_v1';
const REQUEST_TIMEOUT_MS = 15000;

let session = null; // { accessToken, refreshToken, user }
let refreshPromise = null;
const authListeners = new Set();

export class ApiError extends Error {
    constructor(message, status = 0, details) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.details = details;
    }
}

// ── Session persistence ──────────────────────────────────────────────

async function persist(next) {
    session = next;
    try {
        if (next) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        else await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (err) {
        console.warn('[sellerApi] Could not persist session:', err?.message);
    }
}

/** Load a saved session from disk. Returns the user or null. */
export async function restoreSession() {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        session = raw ? JSON.parse(raw) : null;
    } catch {
        session = null;
    }
    return session?.user || null;
}

export const getSession = () => session;
export const getAccessToken = () => session?.accessToken || null;
export const getCurrentUser = () => session?.user || null;

/** Subscribe to forced sign-outs (refresh token expired / revoked). */
export function onSessionExpired(listener) {
    authListeners.add(listener);
    return () => authListeners.delete(listener);
}

async function expireSession() {
    await persist(null);
    authListeners.forEach((fn) => {
        try {
            fn();
        } catch (_) {}
    });
}

// ── HTTP core ────────────────────────────────────────────────────────

async function rawRequest(endpoint, { method = 'GET', body, token, timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

    let res;
    try {
        res = await fetch(`${API_BASE}${endpoint}`, {
            method,
            headers,
            body: body !== undefined ? JSON.stringify(body) : undefined,
            signal: controller?.signal,
        });
    } catch (err) {
        const aborted = err?.name === 'AbortError';
        throw new ApiError(
            aborted
                ? 'The server took too long to respond. Please try again.'
                : `Cannot reach Dropp server (${API_BASE}). Check your connection.`,
            0
        );
    } finally {
        if (timer) clearTimeout(timer);
    }

    const text = await res.text().catch(() => '');
    let data = null;
    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            data = null;
        }
    }

    if (!res.ok) {
        const message =
            data?.message ||
            data?.error ||
            (res.status >= 500 ? 'Server error. Please try again.' : `Request failed (HTTP ${res.status})`);
        throw new ApiError(message, res.status, data?.details);
    }
    if (data === null) throw new ApiError('Unexpected response from server', res.status);
    return data;
}

async function refreshTokens() {
    if (!session?.refreshToken) throw new ApiError('Please log in again.', 401);
    if (!refreshPromise) {
        const refreshToken = session.refreshToken;
        refreshPromise = rawRequest('/api/auth/refresh', { method: 'POST', body: { refreshToken } })
            .then(async (res) => {
                await persist({ ...session, ...res.data });
                return res.data.accessToken;
            })
            .finally(() => {
                refreshPromise = null;
            });
    }
    return refreshPromise;
}

/** Refresh the access token (used by the WebSocket after an auth close). */
export async function refreshSession() {
    try {
        return await refreshTokens();
    } catch (err) {
        if (err.status === 401) await expireSession();
        throw err;
    }
}

async function apiRequest(endpoint, method = 'GET', body, { timeoutMs } = {}) {
    try {
        return await rawRequest(endpoint, { method, body, token: session?.accessToken, timeoutMs });
    } catch (err) {
        if (err.status !== 401 || !session?.refreshToken) throw err;
        let token;
        try {
            token = await refreshTokens();
        } catch (refreshErr) {
            if (refreshErr.status === 401) {
                await expireSession();
                throw new ApiError('Your session has expired. Please log in again.', 401);
            }
            throw refreshErr;
        }
        return rawRequest(endpoint, { method, body, token, timeoutMs });
    }
}

// ── Auth ─────────────────────────────────────────────────────────────

export async function login(identifier, password) {
    const res = await rawRequest('/api/auth/login', {
        method: 'POST',
        body: { identifier: identifier.trim(), password },
    });
    if (res.data?.user?.role !== 'merchant') {
        throw new ApiError('This account is not a seller account. Create a seller account to continue.', 403);
    }
    await persist(res.data);
    return res.data.user;
}

export async function register({ name, phone, email, password }) {
    const res = await rawRequest('/api/auth/register', {
        method: 'POST',
        body: {
            name: name.trim(),
            phone: phone.trim(),
            ...(email?.trim() ? { email: email.trim() } : {}),
            password,
            role: 'merchant',
        },
    });
    await persist(res.data);
    return res.data.user;
}

export async function logout() {
    const refreshToken = session?.refreshToken;
    await persist(null);
    if (refreshToken) {
        // Best effort: revoke on the server; local sign-out already happened
        rawRequest('/api/auth/logout', { method: 'POST', body: { refreshToken } }).catch(() => {});
    }
}

// ── Stores ───────────────────────────────────────────────────────────

export async function fetchMyStores() {
    return (await apiRequest('/api/merchants/mine')).data;
}

export async function createStore(storeData) {
    return (await apiRequest('/api/merchants', 'POST', storeData)).data;
}

export async function fetchDashboard(merchantId) {
    return (await apiRequest(`/api/merchants/${merchantId}/dashboard`)).data;
}

export async function updateStore(merchantId, updates) {
    return (await apiRequest(`/api/merchants/${merchantId}`, 'PATCH', updates)).data;
}

// ── Catalogue ────────────────────────────────────────────────────────

export async function fetchProducts(merchantId, params = {}) {
    const query = Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
    const res = await apiRequest(`/api/merchants/${merchantId}/products${query ? `?${query}` : ''}`);
    return res.data;
}

export async function addProduct(merchantId, productData) {
    return (await apiRequest(`/api/merchants/${merchantId}/products`, 'POST', productData)).data;
}

export async function updateProduct(merchantId, productId, updates) {
    return (await apiRequest(`/api/merchants/${merchantId}/products/${productId}`, 'PATCH', updates)).data;
}

export async function setProductAvailability(merchantId, productId, availability) {
    const endpoint = `/api/merchants/${merchantId}/products/${productId}/availability`;
    return (await apiRequest(endpoint, 'PATCH', { availability })).data;
}

export async function adjustProductStock(merchantId, productId, delta) {
    return (await apiRequest(`/api/merchants/${merchantId}/products/${productId}/stock`, 'POST', { delta })).data;
}

// ── Orders & analytics ───────────────────────────────────────────────

/** status: 'ongoing' | 'completed' | 'cancelled' → { items, counts } */
export async function fetchOrders(merchantId, status) {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    return (await apiRequest(`/api/merchants/${merchantId}/orders${q}`)).data;
}

/** status: 'accepted' | 'preparing' | 'ready_for_pickup' | 'cancelled' */
export async function updateOrderStatus(merchantId, orderId, status) {
    return (await apiRequest(`/api/merchants/${merchantId}/orders/${orderId}/status`, 'PATCH', { status })).data;
}

export async function fetchAnalytics(merchantId, days = 7) {
    return (await apiRequest(`/api/merchants/${merchantId}/analytics?days=${days}`)).data;
}

// ── Voice assistant (Bolna AI) ───────────────────────────────────────

export async function fetchVoiceStatus() {
    return (await apiRequest('/api/voice/seller/status')).data;
}

/** Mints a single-use (~2 min) Bolna web-call session tied to this store. */
export async function startVoiceSession(merchantId, { sellerName, language } = {}) {
    return (await apiRequest('/api/voice/seller/session', 'POST', { merchantId, sellerName, language })).data.session;
}

/**
 * Built-in voice pipeline: send a recording (base64) or text; the server transcribes it, runs the
 * store action and returns { transcript, reply, actions, audioUrl } with a spoken reply.
 */
export async function voiceTurn(merchantId, { audioBase64, text, history, sellerName }) {
    return (
        await apiRequest('/api/voice/seller/turn', 'POST', { merchantId, audioBase64, text, history, sellerName }, { timeoutMs: 45000 })
    ).data;
}

export const voiceAudioUrl = (path) => (path ? `${API_BASE}${path}` : null);
