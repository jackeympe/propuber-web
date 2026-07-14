# PropUber — Cloudflare-Native Deploy (no Render)

All cash rails run **100% on Cloudflare Pages Functions + KV**. There is no
separate backend server. One platform, one deploy.

## Architecture
- `functions/api/[[path]].js` — router for all `/api/*` endpoints
- `functions/_lib/payfast.js` — PayFast checkout, ITN 4-step verify, KV storage
  (embeds a pure-JS MD5 — verified byte-identical to the old Python signature)
- **KV namespace `CASH`** (`036b7efa75544cc0809364407490360e`) — settlement ledger
  + invoice book (replaces Render disk files)

## Endpoints (all on https://propuber-web.pages.dev)
| Path | Method | Purpose |
|------|--------|---------|
| /api/health | GET | liveness |
| /api/cash/summary | GET | cash truth (KV-backed) |
| /api/pay/checkout | POST | signed PayFast checkout |
| /api/pay/notify | POST | ITN webhook (IP + sig + confirm) |
| /api/settlement/record, /totals | POST/GET | escrow |
| /api/invoice/create, /list | POST/GET | invoice book |
| /api/listings, /api/gigs | GET | static reads |

## Config (CF Pages → Settings → Variables)
- `PAYFAST_MODE=live`, `PAYFAST_MERCHANT_ID=34149035` (plain)
- `PAYFAST_MERCHANT_KEY`, `PAYFAST_PASSPHRASE` (encrypted secrets)
- KV binding `CASH` bound in `wrangler.toml`

## Deploy
```
export CLOUDFLARE_API_TOKEN=<pages-edit-token>
export CLOUDFLARE_ACCOUNT_ID=6e3906bcaf0efe7036899df26164d0e1
node_modules/.bin/wrangler pages deploy dist --project-name propuber-web --commit-dirty=true
```
Token needs **Pages:Edit** to deploy; **Workers KV Storage:Edit** to manage KV.
Editing project env/KV bindings via REST PATCH needs the Pages:Edit token.

## PayFast dashboard (final step for auto-booking real cash)
Settings → global **notify_url** = `https://propuber-web.pages.dev/api/pay/notify`
Passphrase must match `PAYFAST_PASSPHRASE`. ITN ports 80/8080/8081/443 (CF=443 ✅).

## Render — DECOMMISSIONED
Old service `srv-d9b4fd7lk1mc73cehp00` is no longer used. Delete it in the Render
dashboard to stop the (free) service. `render.yaml` / `Dockerfile` removed from repo.
