/**
 * authStorage.js — Persistent customer identity helper for Dropp
 * ─────────────────────────────────────────────────────────────────
 * Stores a stable customer ID in AsyncStorage so the same device
 * always identifies itself consistently across sessions.
 *
 * In a production app this would store a JWT issued after login.
 * For the Dropp hackathon demo we use a persistent device-bound ID
 * that the backend receives via x-customer-id header (already
 * supported in orderController.js as a fallback).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CUSTOMER_ID_KEY = 'dropp_customer_id';

/**
 * Returns the stored customer ID, creating one on first run.
 * Format: cust_<timestamp>_<random4hex>  e.g. cust_1730000000000_a3f7
 */
export async function getCustomerId() {
    try {
        let id = await AsyncStorage.getItem(CUSTOMER_ID_KEY);
        if (!id) {
            const rand = Math.floor(Math.random() * 0xffff)
                .toString(16)
                .padStart(4, '0');
            id = `cust_${Date.now()}_${rand}`;
            await AsyncStorage.setItem(CUSTOMER_ID_KEY, id);
        }
        return id;
    } catch (_) {
        // AsyncStorage unavailable — return an in-memory ephemeral ID
        return `cust_ephemeral_${Date.now()}`;
    }
}

/**
 * Overwrite the stored customer ID (useful for testing multiple accounts).
 */
export async function setCustomerId(id) {
    if (!id || typeof id !== 'string') return;
    await AsyncStorage.setItem(CUSTOMER_ID_KEY, id.trim());
}

/**
 * Clear the stored ID (logout).
 */
export async function clearCustomerId() {
    await AsyncStorage.removeItem(CUSTOMER_ID_KEY);
}

