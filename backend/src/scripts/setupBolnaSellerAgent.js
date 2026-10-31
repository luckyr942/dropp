// Creates (or updates) the Dropp Seller voice agent on Bolna with all seller tools wired to this backend.
// Usage: node src/scripts/setupBolnaSellerAgent.js
// Needs in backend/.env: BOLNA_API_KEY, BOLNA_TOOL_SECRET, PUBLIC_API_URL (https URL Bolna can reach).
// If BOLNA_SELLER_AGENT_ID is set the agent is updated in place; otherwise a new one is created and
// its id is appended to backend/.env.
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSellerAgentPayload } from '../modules/sellerVoice/bolnaSellerAgent.js';

const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env');
const { BOLNA_API_KEY, BOLNA_TOOL_SECRET, PUBLIC_API_URL, BOLNA_SELLER_AGENT_ID } = process.env;

for (const [k, v] of Object.entries({ BOLNA_API_KEY, BOLNA_TOOL_SECRET, PUBLIC_API_URL })) {
  if (!v) {
    console.error(`Missing ${k} in backend/.env`);
    process.exit(1);
  }
}
if (!/^https:\/\//.test(PUBLIC_API_URL)) {
  console.error('PUBLIC_API_URL must be an https URL that Bolna can reach (e.g. a cloudflared/ngrok tunnel).');
  process.exit(1);
}

const payload = buildSellerAgentPayload({ publicApiUrl: PUBLIC_API_URL, toolSecret: BOLNA_TOOL_SECRET });

async function send(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${BOLNA_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { ok: res.ok, status: res.status, json };
}

let result;
if (BOLNA_SELLER_AGENT_ID) {
  result = await send('PUT', `https://api.bolna.ai/v2/agent/${BOLNA_SELLER_AGENT_ID}`, payload);
} else {
  result = await send('POST', 'https://api.bolna.ai/v2/agent', payload);
}

if (!result.ok) {
  console.error(`Bolna rejected the agent (HTTP ${result.status}):`, JSON.stringify(result.json, null, 2).slice(0, 2000));
  process.exit(1);
}

const agentId = BOLNA_SELLER_AGENT_ID || result.json.agent_id;
if (!BOLNA_SELLER_AGENT_ID && agentId) {
  fs.appendFileSync(envPath, `BOLNA_SELLER_AGENT_ID=${agentId}\n`);
  console.log('Saved BOLNA_SELLER_AGENT_ID to backend/.env');
}
console.log(`Seller voice agent ${BOLNA_SELLER_AGENT_ID ? 'updated' : 'created'}: ${agentId}`);
console.log(`Tools point at ${PUBLIC_API_URL.replace(/\/+$/, '')}/api/voice/seller/tools/<name>`);
