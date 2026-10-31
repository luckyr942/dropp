// Streamable HTTP endpoint for the Dropp MCP server, mounted at /mcp on the main backend so tool calls
// share the live process state (offer queue, WebSocket clients) with the mobile apps.
import { Router } from 'express';
import crypto from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createDroppMcpServer } from './mcpServer.js';
import { config } from '../config/config.js';

const router = Router();

function safeEqual(a, b) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

function requireMcpKey(req, res, next) {
  if (!config.mcpApiKey) {
    return res.status(503).json({ jsonrpc: '2.0', error: { code: -32000, message: 'MCP is disabled: MCP_API_KEY is not set' }, id: null });
  }
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token || !safeEqual(token, config.mcpApiKey)) {
    return res.status(401).json({ jsonrpc: '2.0', error: { code: -32001, message: 'Unauthorized' }, id: null });
  }
  next();
}

router.use(requireMcpKey);

// Stateless mode: a fresh server + transport per request, so there is no session state to leak or expire.
router.post('/', async (req, res) => {
  const server = createDroppMcpServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  res.on('close', () => {
    transport.close();
    server.close();
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error('[MCP] Request failed:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null });
    }
  }
});

const methodNotAllowed = (req, res) =>
  res.status(405).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed' }, id: null });
router.get('/', methodNotAllowed);
router.delete('/', methodNotAllowed);

export default router;
