import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { getWsBase } from '../../../shared/utils/apiConfig';
import * as sellerApi from '../api/sellerApi.js';

const MAX_BACKOFF_MS = 30000;

/**
 * Live merchant events over WebSocket (ws://host:4000?merchantId=&token=).
 * Reconnects with exponential backoff, refreshes the access token when the
 * server closes with 4001, and reconnects when the app returns to foreground.
 *
 * @returns {'connecting'|'live'|'offline'} connection status
 */
// Store-room events the dashboard reacts to (orders, plus changes Aura makes by voice)
const FORWARDED_EVENTS = new Set([
    'merchant.new_order',
    'ORDER_STATUS_UPDATE',
    'merchant.product_updated',
    'merchant.voice_action',
    'merchant.store_updated',
]);

export function useMerchantSocket(merchantId, onEvent) {
    const [status, setStatus] = useState('connecting');
    const onEventRef = useRef(onEvent);
    onEventRef.current = onEvent;

    useEffect(() => {
        if (!merchantId) return undefined;
        let ws = null;
        let retryTimer = null;
        let attempt = 0;
        let disposed = false;

        const scheduleReconnect = () => {
            if (disposed) return;
            clearTimeout(retryTimer);
            const delay = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** attempt);
            attempt += 1;
            retryTimer = setTimeout(connect, delay);
        };

        function connect() {
            if (disposed) return;
            clearTimeout(retryTimer);
            const token = sellerApi.getAccessToken();
            if (!token) {
                setStatus('offline');
                return;
            }
            setStatus('connecting');
            const url = `${getWsBase()}?merchantId=${encodeURIComponent(merchantId)}&token=${encodeURIComponent(token)}`;
            const socket = new WebSocket(url);
            ws = socket;

            socket.onmessage = (e) => {
                let msg;
                try {
                    msg = JSON.parse(e.data);
                } catch {
                    return;
                }
                if (msg?.type === 'ws.connected' && msg.data?.role === 'merchant') {
                    attempt = 0;
                    setStatus('live');
                    return;
                }
                // Only events addressed to this store's room carry our merchantId
                if (msg?.data?.merchantId && msg.data.merchantId !== merchantId) return;
                if (FORWARDED_EVENTS.has(msg?.type)) {
                    if (msg.data?.merchantId) onEventRef.current?.(msg);
                }
            };

            socket.onclose = async (e) => {
                if (ws !== socket || disposed) return;
                setStatus('offline');
                if (e?.code === 4001) {
                    // Access token expired → refresh, then reconnect immediately
                    try {
                        await sellerApi.refreshSession();
                        attempt = 0;
                        connect();
                        return;
                    } catch {
                        return; // refresh failed → app is signed out
                    }
                }
                if (e?.code === 4004) return; // store no longer accessible
                scheduleReconnect();
            };

            socket.onerror = () => {
                // onclose follows and handles reconnect
            };
        }

        connect();

        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active' && (!ws || ws.readyState === WebSocket.CLOSED)) {
                attempt = 0;
                connect();
            }
        });

        return () => {
            disposed = true;
            clearTimeout(retryTimer);
            sub.remove();
            if (ws) {
                ws.onclose = null;
                ws.close();
            }
        };
    }, [merchantId]);

    return status;
}
