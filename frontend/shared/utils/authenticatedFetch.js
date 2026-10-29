/**
 * authenticatedFetch.js — Central HTTP helper for Dropp frontend
 * ─────────────────────────────────────────────────────────────────
 * Attaches the persistent customer ID to every request so the
 * backend can identify the caller without a full JWT auth system.
 *
 * The backend (orderController.js) already reads:
 *   req.user?.id || req.headers['x-customer-id'] || req.body.customerId
 *
 * Usage:
 *   import { authenticatedFetch } from '../../../shared/utils/authenticatedFetch';
 *   const data = await authenticatedFetch('/api/orders/draft', {
 *       method: 'POST',
 *       body: JSON.stringify({ ... }),
 *   });
 */

import { API_BASE } from './apiConfig.js';
import { getCustomerId } from './authStorage.js';

/**
 * @param {string} path   API path, e.g. '/api/orders/draft'
 * @param {RequestInit} options  Standard fetch options (method, body, headers…)
 * @returns {Promise<any>}  Parsed JSON response body
 * @throws {Error} if network fails OR if response.ok is false
 */
export async function authenticatedFetch(path, options = {}) {
    const customerId = await getCustomerId();

    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
            // Backend reads this as the caller identity
            'x-customer-id': customerId,
        },
    });

    let data;
    try {
        data = await response.json();
    } catch (_) {
        throw new Error(`Server returned non-JSON response (status ${response.status})`);
    }

    if (!response.ok) {
        throw new Error(
            data?.message || data?.error || `Request failed with status ${response.status}`
        );
    }

    return data;
}

