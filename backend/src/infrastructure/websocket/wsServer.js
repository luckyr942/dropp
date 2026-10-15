import { WebSocketServer, WebSocket } from 'ws';

let wss = null;

export function setupWebSockets(httpServer) {
    wss = new WebSocketServer({ server: httpServer });

    wss.on('connection', (ws) => {
        console.log('[WS] Client connected. Total:', wss.clients.size);

        ws.on('close', () => {
            console.log('[WS] Client disconnected. Total:', wss.clients.size);
        });

        ws.on('error', (err) => {
            console.error('[WS] Socket error:', err.message);
        });
    });

    console.log('[WS] WebSocket server attached to HTTP server');
}

export function broadcast(eventType, data) {
    if (!wss) return;

    const message = JSON.stringify({ type: eventType, data, at: new Date().toISOString() });

    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}
