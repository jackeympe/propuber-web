# PropUber Backend — Go-Live Deploy Guide

The FastAPI backend (`backend/main.py`) hosts 3 cash rails + the PayFast ITN
webhook. Cloudflare Pages CANNOT run Python, so the backend needs a Python host.
Once deployed, set `PROPUBER_BACKEND_URL` on the CF Pages project and `/api/*`
(including `/api/pay/notify`) proxies through to it.

## Fastest path — Render (free, ~5 min)
1. Push repo to GitHub (see git section below).
2. Go to render.com → New → Blueprint → point at this repo. It reads `render.yaml`.
3. When prompted, paste the 4 secret env vars (values NOT in repo):
   - `PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`, `PAYFAST_PASSPHRASE`, `PROPUBER_APPROVE_TOKEN`
4. Deploy → you get `https://propuber-backend.onrender.com`. Verify: `curl .../health`.

## Wire the frontend proxy
In Cloudflare Pages → propuber-web → Settings → Environment variables:
```
PROPUBER_BACKEND_URL = https://propuber-backend.onrender.com
```
Redeploy Pages. Now `https://propuber-web.pages.dev/api/pay/notify` reaches FastAPI.

## PayFast dashboard (required for real cash to auto-book)
1. Settings → set global **notify_url** = `https://propuber-web.pages.dev/api/pay/notify`
2. Confirm passphrase matches `PAYFAST_PASSPHRASE`.
3. ITN uses ports 80/8080/8081/443 — CF Pages is 443 ✅.
4. PayFast ITN source IPs (already whitelisted in code): 197.97.145.144/28,
   41.74.179.192/27, 102.216.36.0/28, 102.216.36.128/28, 144.126.193.139.

## Alt: quick public tunnel for testing (no deploy)
Install cloudflared, then: `cloudflared tunnel --url http://localhost:5002`
Use the printed https URL as `notify_url` for a live test transaction.

## Verify end-to-end
- `curl https://<backend>/api/cash/summary` → `payfast_live_ready: true`
- Send a client the pay link → complete payment → `real_cash_collected_zar` increases.
