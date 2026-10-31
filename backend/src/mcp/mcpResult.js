// Shared helpers for shaping MCP tool results.

// Route polylines are thousands of points; agents never need them and they blow up context.
const HEAVY_KEYS = new Set(['geometry', 'routeGeometry', '__v']);

// A replacer (not a manual walk) so mongoose documents serialise through their own toJSON.
const dropHeavy = (key, value) => (HEAVY_KEYS.has(key) ? undefined : value);

export function ok(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data ?? null, dropHeavy, 2) }] };
}

export function fail(err) {
  const message = err?.message || String(err);
  return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
}

// Wraps a handler so thrown service errors come back as MCP tool errors instead of protocol errors.
export const safe = (fn) => async (args) => {
  try {
    return ok(await fn(args));
  } catch (err) {
    console.error('[MCP] Tool error:', err.message);
    return fail(err);
  }
};
