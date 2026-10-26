// Connects to the backend WebSocket and tracks a specific driver's live GPS position.
import { useState, useEffect, useRef } from 'react';
import { WS_BASE } from '../utils/apiConfig';

export function useLiveDriverLocation({ customerId, driverId }) {
    const [driverPos, setDriverPos] = useState(null);
    const wsRef = useRef(null);

    const activeCustId = customerId || 'cust_live_001';

    useEffect(() => {
        let reconnectTimer = null;
        let isDead = false;

        function connect() {
            try {
                const wsUrl = `${WS_BASE}?customerId=${encodeURIComponent(activeCustId)}`;
                const ws = new WebSocket(wsUrl);
                wsRef.current = ws;

                ws.onopen = () => {
                    console.log('[LiveTracking] WS connected to', wsUrl);
                };

                ws.onmessage = (e) => {
                    try {
                        const msg = JSON.parse(e.data);
                        if (msg.type === 'driver.location_update') {
                            const data = msg.data || {};
                            // Match driverId if provided, or accept if matching active driver
                            if (!driverId || String(data.driverId) === String(driverId)) {
                                setDriverPos({
                                    lat: Number(data.lat),
                                    lng: Number(data.lng),
                                    bearing: Number(data.bearing ?? 0),
                                });
                            }
                        }
                    } catch (err) {
                        console.error("[LiveTracking] Error parsing message", err);
                    }
                };

                ws.onclose = () => {
                    if (!isDead) {
                        // Auto-reconnect after 3 seconds
                        reconnectTimer = setTimeout(connect, 3000);
                    }
                };

                ws.onerror = () => {
                    ws.close();
                };
            } catch (err) {
                console.warn('[LiveTracking] WS connection failed:', err.message);
            }
        }

        connect();

        return () => {
            isDead = true;
            clearTimeout(reconnectTimer);
            try { wsRef.current?.close(); } catch (_) {}
        };
    }, [customerId, driverId]);

    return driverPos;
}

export default useLiveDriverLocation;
