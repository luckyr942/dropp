import { WebSocketServer, WebSocket } from 'ws';

let wss = null;

// Maps customerId → Set of WebSocket clients (one customer can have multiple tabs/devices)
const customerRooms = new Map();

export function setupWebSockets(httpServer) {
    wss = new WebSocketServer({ server: httpServer });

    wss.on('connection', (ws, req) => {
        // Extract customerId from query string: ws://host:4000?customerId=cust_123
        const url = new URL(req.url, 'http://localhost');
        const customerId = url.searchParams.get('customerId') || 'anonymous';

        ws.customerId = customerId;

        // Register in room
        if (!customerRooms.has(customerId)) {
            customerRooms.set(customerId, new Set());
        }
        customerRooms.get(customerId).add(ws);

        console.log(`[WS] Client connected. customerId=${customerId}. Total:`, wss.clients.size);

        // Send a welcome ping so client knows the connection is alive
        ws.send(JSON.stringify({ type: 'ws.connected', data: { customerId }, at: new Date().toISOString() }));

        ws.on('close', () => {
            const room = customerRooms.get(customerId);
            if (room) {
                room.delete(ws);
                if (room.size === 0) customerRooms.delete(customerId);
            }
            console.log(`[WS] Client disconnected. customerId=${customerId}. Total:`, wss.clients.size);
        });

        ws.on('error', (err) => {
            console.error('[WS] Socket error:', err.message);
        });
    });

    console.log('[WS] WebSocket server attached to HTTP server');
}

// Broadcast to ALL connected clients (for driver broadcast etc.)
export function broadcast(eventType, data) {
    if (!wss) return;
    const message = JSON.stringify({ type: eventType, data, at: new Date().toISOString() });
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// Send event only to a specific customer's sockets
export function emitToCustomer(customerId, eventType, data) {
    if (!wss) return;
    const room = customerRooms.get(customerId);
    if (!room || room.size === 0) {
        // Customer not connected via WS — that's fine, just log
        console.warn(`[WS] No socket found for customerId=${customerId}. Event dropped: ${eventType}`);
        return;
    }
    const message = JSON.stringify({ type: eventType, data, at: new Date().toISOString() });
    room.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(message);
        }
    });
}
