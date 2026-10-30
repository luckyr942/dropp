import { API_BASE } from '../../../shared/utils/apiConfig.js';

let cachedToken = null;
let cachedMerchantId = null;

export const setAuthSession = (token, merchantId) => {
    cachedToken = token;
    cachedMerchantId = merchantId;
};

export const getAuthSession = () => ({
    token: cachedToken,
    merchantId: cachedMerchantId,
});

async function apiRequest(endpoint, method = 'GET', body = null) {
    const headers = {
        'Content-Type': 'application/json',
    };
    if (cachedToken) {
        headers['Authorization'] = `Bearer ${cachedToken}`;
    }

    const config = { method, headers };
    if (body) {
        config.body = JSON.stringify(body);
    }

    const res = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.message || data.error || `HTTP error ${res.status}`);
    }
    return data;
}

// ─── AUTH ──────────────────────────────────────────────────────────
export async function registerMerchant(userData) {
    const res = await apiRequest('/api/auth/register', 'POST', {
        ...userData,
        role: 'merchant',
    });
    if (res.data?.accessToken) {
        cachedToken = res.data.accessToken;
    }
    return res.data;
}

export async function loginMerchant(identifier, password) {
    const res = await apiRequest('/api/auth/login', 'POST', { identifier, password });
    if (res.data?.accessToken) {
        cachedToken = res.data.accessToken;
    }
    return res.data;
}

// ─── STORES ────────────────────────────────────────────────────────
export async function fetchMyStores() {
    const res = await apiRequest('/api/merchants/mine');
    return res.data;
}

export async function createStore(storeData) {
    const res = await apiRequest('/api/merchants', 'POST', storeData);
    if (res.data?._id) {
        cachedMerchantId = res.data._id;
    }
    return res.data;
}

export async function fetchDashboard(merchantId = cachedMerchantId) {
    if (!merchantId) return null;
    const res = await apiRequest(`/api/merchants/${merchantId}/dashboard`);
    return res.data;
}

export async function updateStoreSettings(merchantId, updates) {
    const res = await apiRequest(`/api/merchants/${merchantId}`, 'PATCH', updates);
    return res.data;
}

// ─── CATALOGUE ─────────────────────────────────────────────────────
export async function fetchProducts(merchantId = cachedMerchantId, params = {}) {
    if (!merchantId) return { items: [], total: 0 };
    const query = new URLSearchParams(params).toString();
    const endpoint = `/api/merchants/${merchantId}/products${query ? `?${query}` : ''}`;
    const res = await apiRequest(endpoint);
    return res.data;
}

export async function addProduct(merchantId = cachedMerchantId, productData) {
    const res = await apiRequest(`/api/merchants/${merchantId}/products`, 'POST', productData);
    return res.data;
}

export async function adjustProductStock(merchantId = cachedMerchantId, productId, delta) {
    const res = await apiRequest(`/api/merchants/${merchantId}/products/${productId}/stock`, 'POST', { delta });
    return res.data;
}
