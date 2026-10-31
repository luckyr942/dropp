import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { config } from '../../config/config.js';
import { Merchant } from '../../modules/merchants/merchantModel.js';

let wss = null;

// Maps customerId → Set of WebSocket clients (one customer can have multiple tabs/devices)
const customerRooms = new Map();
const dashboardClients = new Set();
// Maps merchantId → Set of seller-app sockets (owner verified via access token)
const merchantRooms = new Map();

function leaveMerchantRoom(ws) {
    const room = merchantRooms.get(ws.merchantId);
    if (!room) return;
    room.delete(ws);
    if (room.size === 0) merchantRooms.delete(ws.merchantId);
}

// Seller app sockets: ws://host:4000?merchantId=<id>&token=<accessToken>
// Only the store owner may join; failures close with 4001 (auth) / 4004 (store).
async function joinMerchantRoom(ws, merchantId, token) {
    let payload;
    try {
        payload = jwt.verify(token || '', process.env.JWT_ACCESS_SECRET);
    } catch {
        ws.close(4001, 'Invalid or expired token');
        return;
    }
    try {
        const owned =
            payload.role === 'merchant' &&
            /^[0-9a-fA-F]{24}$/.test(merchantId) &&
            (await Merchant.exists({ _id: merchantId, ownerId: payload.sub }));
        if (!owned) {
            ws.close(4004, 'Store not found');
            return;
        }
    } catch (err) {
        console.error('[WS] Merchant room lookup failed:', err.message);
        ws.close(1011, 'Server error');
        return;
    }
    if (ws.readyState !== WebSocket.OPEN) return;
    ws.merchantId = merchantId;
    if (!merchantRooms.has(merchantId)) merchantRooms.set(merchantId, new Set());
    merchantRooms.get(merchantId).add(ws);
    ws.send(JSON.stringify({ type: 'ws.connected', data: { merchantId, role: 'merchant' }, at: new Date().toISOString() }));
}

export function setupWebSockets(httpServer) {
    wss = new WebSocketServer({ server: httpServer });
    // The ws server re-emits the HTTP server's listen errors; main.js already reports them
    wss.on('error', () => {});

    wss.on('connection', (ws, req) => {
        // Extract customerId from query string: ws://host:4000?customerId=cust_123
        const url = new URL(req.url, 'http://localhost');
        const customerId = url.searchParams.get('customerId') || 'anonymous';
        const isDashboard =
            url.searchParams.get('role') === 'dashboard' &&
            Boolean(config.operationsKey) &&
            url.searchParams.get('operationsKey') === config.operationsKey;

        ws.customerId = customerId;

        // Seller app sockets join a merchant room only (never a customer room)
        const merchantId = url.searchParams.get('merchantId');
        if (merchantId && !isDashboard) {
            joinMerchantRoom(ws, merchantId, url.searchParams.get('token'));
            ws.on('close', () => leaveMerchantRoom(ws));
            ws.on('error', (err) => console.error('[WS] Merchant socket error:', err.message));
            return;
        }

        if (isDashboard) {
            dashboardClients.add(ws);
        } else {
            // Register in a customer-specific room. Operations clients are never
            // placed here, so customer events cannot leak to the dashboard.
            if (!customerRooms.has(customerId)) customerRooms.set(customerId, new Set());
            customerRooms.get(customerId).add(ws);
        }

        console.log(`[WS] Client connected. customerId=${customerId}. Total:`, wss.clients.size);

        // Send a welcome ping so client knows the connection is alive
        ws.send(JSON.stringify({ type: 'ws.connected', data: { customerId, role: isDashboard ? 'dashboard' : 'customer' }, at: new Date().toISOString() }));

        ws.on('close', () => {
            if (isDashboard) {
                dashboardClients.delete(ws);
            } else {
                const room = customerRooms.get(customerId);
                if (room) {
                    room.delete(ws);
                    if (room.size === 0) customerRooms.delete(customerId);
                }
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

// Send event to a specific customer's sockets, with fallback to connected customer sockets
export function emitToCustomer(customerId, eventType, data) {
    if (!wss) return;
    const message = JSON.stringify({ type: eventType, data, at: new Date().toISOString() });
    const room = customerRooms.get(customerId);
    
    if (room && room.size > 0) {
        room.forEach((ws) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(message);
            }
        });
        return;
    }

    // Fallback: If customer is connected as 'anonymous' or reconnected without query param,
    // deliver to non-dashboard clients so real-time UI never misses ride/order updates.
    console.log(`[WS] Routing ${eventType} to active customer sockets (fallback for ${customerId})`);
    const anonRoom = customerRooms.get('anonymous');
    if (anonRoom && anonRoom.size > 0) {
        anonRoom.forEach((ws) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(message);
            }
        });
    }
}

// Operations updates are deliberately sent only to authenticated dashboard
// sockets, never broadcast to every connected customer device.
export function emitToDashboard(eventType, data) {
    const message = JSON.stringify({ type: eventType, data, at: new Date().toISOString() });
    dashboardClients.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(message);
    });
}

// Seller app: send an event to every socket of one merchant (store).
export function emitToMerchant(merchantId, eventType, data) {
    if (!merchantId) return;
    const room = merchantRooms.get(merchantId.toString());
    if (!room || room.size === 0) return;
    const message = JSON.stringify({ type: eventType, data: { ...data, merchantId: merchantId.toString() }, at: new Date().toISOString() });
    room.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(message);
    });
}
