// Connects to the backend WebSocket and tracks a specific driver's live GPS position.
import { useState, useEffect, useRef } from 'react';
import { WS_BASE } from '../utils/apiConfig';

export function useLiveDriverLocation({ customerId, driverId }) {
    const [driverPos, setDriverPos] = useState(null);
    const wsRef = useRef(null);

    useEffect(() => {
        // Without a driver id we can't tell whose position an update is, so show nothing
        if (!driverId) {
            setDriverPos(null);
            return undefined;
        }
        let reconnectTimer = null;
        let isDead = false;

        function connect() {
            try {
                const wsUrl = customerId ? `${WS_BASE}?customerId=${encodeURIComponent(customerId)}` : WS_BASE;
                const ws = new WebSocket(wsUrl);
                wsRef.current = ws;

                ws.onmessage = (e) => {
                    try {
                        const msg = JSON.parse(e.data);
                        if (msg.type === 'driver.location_update') {
                            const data = msg.data || {};
                            if (String(data.driverId) === String(driverId)) {
                                setDriverPos({
                                    lat: Number(data.lat),
                                    lng: Number(data.lng),
                                    bearing: Number(data.bearing ?? 0),
                                });
                            }
                        }
                    } catch (_) {}
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
            } catch (_) {}
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
