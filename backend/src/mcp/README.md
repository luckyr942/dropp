# Dropp MCP layer

A [Model Context Protocol](https://modelcontextprotocol.io) server that lets any AI agent (Claude, ChatGPT, Gemini, or Aura) work all three sides of Dropp through one standard interface. It runs inside the main backend at `POST /mcp` (Streamable HTTP, stateless), so tool calls share the live offer queue and WebSocket clients with the mobile apps. When an agent books a ride, the driver app shows the offer and the customer app updates, just as if someone had tapped the button.

| Side | Tools |
|---|---|
| Customer | `customer_search_restaurants`, `customer_get_menu`, `customer_build_food_cart`, `customer_estimate_ride`, `customer_confirm_booking`, `customer_get_status`, `customer_cancel_ride` |
| Merchant | `merchant_find_store`, `merchant_dashboard`, `merchant_list_products`, `merchant_adjust_stock`, `merchant_set_stock`, `merchant_set_availability`, `merchant_list_orders`, `merchant_update_order_status` |
| Driver | `driver_list_fleet`, `driver_get_profile`, `driver_set_online`, `driver_list_offers`, `driver_accept_offer`, `driver_update_trip` |

`customer_confirm_booking` places whatever is pending on the customer's session. If both a ride quote and a food cart are pending, it books them together through the multi-service orchestrator ("Confirm Both").

## Auth

Send `Authorization: Bearer <MCP_API_KEY>`. In development the key defaults to `dropp-demo-mcp-key`. In production, `/mcp` is disabled until `MCP_API_KEY` is set.

## Connect

- **Claude Code**: the repo's `.mcp.json` already registers `dropp`. Start the backend, then run `claude` from the repo root and approve the server.
- **Claude Desktop**: add to `claude_desktop_config.json`:
  ```json
  { "mcpServers": { "dropp": { "command": "npx", "args": ["-y", "mcp-remote", "http://localhost:4000/mcp", "--header", "Authorization: Bearer dropp-demo-mcp-key"] } } }
  ```
- **MCP Inspector**: `npx @modelcontextprotocol/inspector`, transport "Streamable HTTP", URL `http://localhost:4000/mcp`, plus the auth header.

## Smoke test

With the backend running: `npm run mcp:test --prefix backend`. It goes through the whole journey: merchant stock change → ride quote + food cart → confirm both → driver accepts → trip completes.
