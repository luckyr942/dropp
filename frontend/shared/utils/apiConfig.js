/**
 * apiConfig.js — Universal multi-device API & WebSocket URL resolver for Dropp
 * ─────────────────────────────────────────────────────────────────────────────
 * Seamlessly connects to the Dropp backend on port 4000 across:
 *  • Physical Android phone via Expo Go (uses Metro LAN IP or Wi-Fi IP)
 *  • Physical iPhone via Expo Go (uses Metro LAN IP or Wi-Fi IP)
 *  • Android Emulator (uses 10.0.2.2)
 *  • iOS Simulator (uses localhost:4000)
 *
 * Usage:
 *   import { API_BASE, WS_BASE, getApiBase, getWsBase } from '../../../shared/utils/apiConfig';
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Default Mac LAN IP fallback when running on the local network
const DEFAULT_LAN_IP = '192.168.1.39';
const BACKEND_PORT = 4000;

/**
 * Extracts the host IP or hostname that Metro bundler is serving from.
 * In Expo Go, this is automatically the computer's current Wi-Fi IP!
 */
function getMetroHost() {
    try {
        const hostUri =
            Constants?.expoConfig?.hostUri ||
            Constants?.manifest2?.extra?.expoClient?.hostUri ||
            Constants?.manifest?.debuggerHost;

        if (hostUri && typeof hostUri === 'string') {
            const host = hostUri.split(':')[0];
            if (host && host !== 'localhost' && host !== '127.0.0.1') {
                return host;
            }
        }
    } catch (_) {}
    return null;
}

function isAndroidEmulator() {
    // If Android and running on localhost or 10.0.2.2 or __DEV__ without a physical host
    if (Platform.OS !== 'android') return false;
    const host = getMetroHost();
    return !host || host === '10.0.2.2';
}

function isIosSimulator() {
    if (Platform.OS !== 'ios') return false;
    return Constants?.isDevice === false || !Constants?.isDevice;
}

export function getApiBase() {
    // 1. iOS Simulator (always direct localhost to avoid Apple App Transport Security LAN blocks)
    if (isIosSimulator()) {
        return `http://localhost:${BACKEND_PORT}`;
    }

    // 2. Android Emulator (always 10.0.2.2 loopback)
    if (isAndroidEmulator()) {
        return `http://10.0.2.2:${BACKEND_PORT}`;
    }

    // 3. Explicit env variable (for physical devices or custom deployment)
    const envUrl = process.env.EXPO_PUBLIC_API_URL;
    if (envUrl && typeof envUrl === 'string') {
        if (Platform.OS === 'android' && envUrl.includes('localhost')) {
            const metroHost = getMetroHost();
            return metroHost ? `http://${metroHost}:${BACKEND_PORT}` : `http://${DEFAULT_LAN_IP}:${BACKEND_PORT}`;
        }
        return envUrl.replace(/\/+$/, '');
    }

    // 4. Metro host auto-detected from Expo Go (for physical devices over Wi-Fi)
    const metroHost = getMetroHost();
    if (metroHost) {
        return `http://${metroHost}:${BACKEND_PORT}`;
    }

    // 5. Default LAN fallback for physical devices
    return `http://${DEFAULT_LAN_IP}:${BACKEND_PORT}`;
}

export function getWsBase() {
    // 1. iOS Simulator
    if (isIosSimulator()) {
        return `ws://localhost:${BACKEND_PORT}`;
    }

    // 2. Android Emulator
    if (isAndroidEmulator()) {
        return `ws://10.0.2.2:${BACKEND_PORT}`;
    }

    // 3. Explicit env variable
    const envWs = process.env.EXPO_PUBLIC_WS_URL;
    if (envWs && typeof envWs === 'string') {
        if (Platform.OS === 'android' && envWs.includes('localhost')) {
            const metroHost = getMetroHost();
            const host = metroHost || DEFAULT_LAN_IP;
            return `ws://${host}:${BACKEND_PORT}`;
        }
        return envWs.replace(/\/+$/, '');
    }

    const api = getApiBase();
    return api.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
}

export const API_BASE = getApiBase();
export const WS_BASE = getWsBase();

export default {
    API_BASE,
    WS_BASE,
    getApiBase,
    getWsBase,
};
