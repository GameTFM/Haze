# haze deploy guide — every host

The UI is fully static (`public/`). The APIs are stateless serverless functions.
Only the **proxy itself (wisp)** needs a long-lived Node server.

## What runs where

| Piece | Docker / VPS / Render / Fly | Vercel | Netlify | Cloudflare Pages |
| ----- | --------------------------- | ------ | ------- | ---------------- |
| UI (`public/`) | ✅ | ✅ | ✅ | ✅ |
| `/music/*`, `/games/*`, `/ai/relay` | ✅ (server.js) | ✅ (`api/*`) | ✅ (`netlify/functions/*`) | ✅ (`functions/*`) |
| `/chat/*` (ephemeral) | ✅ persistent (`chat-data.json`) | ✅ resets on cold start | ✅ resets on cold start | ✅ resets per isolate |
| `/wisp/` proxy browsing | ✅ | ❌ needs external wisp | ❌ needs external wisp | ❌ needs external wisp |

Serverless/edge runtimes can't hold the persistent wisp websocket + raw TCP
the Scramjet/Ultraviolet engines need. So: deploy the UI + APIs anywhere, and
point browsing at one always-on Node backend.

## Option A — full backend (proxy works, zero config)

```sh
docker build -t haze . && docker run -p 8000:8000 -e CHAT_SECRET=$(openssl rand -hex 32) haze
# or: Render (render.yaml) / Fly.io (fly.toml) / any VPS with node server.js
```

Chat persists via `chat-data.json` (set `CHAT_DB_PATH=/data/chat-data.json` with a volume).

## Option B — static hosts (Vercel / Netlify / Cloudflare Pages)

```sh
# Vercel: import the repo, output dir `public/` (vercel.json handles rewrites)
# Netlify: build none, publish `public/`, functions `netlify/functions` (netlify.toml handles it)
# Cloudflare Pages: build none, output `public/`, functions in `functions/` auto-route
```

Music / games / AI / ephemeral chat work out of the box. Browsing shows the
proxy UI but can't tunnel until you set a wisp backend — paste it into
**Settings → Proxy engine** (wisp server field, e.g.
`wss://your-node-backend/wisp/`; API server field routes ALL APIs incl.
persistent chat at the Node backend). It reloads automatically.

 equivalents if you prefer code over clicks:

- `localStorage.setItem("haze-wisp-url", "wss://your-node-backend/wisp/")`, or
- `<script>window.__HAZE_WISP_URL="wss://your-node-backend/wisp/"</script>` before `haze-config.js`, or
- `<script>window.__HAZE_API_BASE="https://your-node-backend"</script>` to route ALL APIs (incl. persistent chat) at the Node backend instead of serverless.

## Option C — split (recommended for static + working proxy)

1. Deploy one Node backend (Option A) — e.g. `https://haze-api.onrender.com`.
2. Deploy the UI to Vercel/Netlify/Cloudflare.
3. Set `__HAZE_WISP_URL=https://haze-api…/wisp/` (or API_BASE to the same host).
4. Browsing rides the Node host; music/games/AI can stay serverless or ride along.

## Files

- `public/haze-config.js` — `HazeApi(path)` / `HazeWisp()` overrides, same-origin by default
- `api/` — Vercel serverless (imports `api/_haze.mjs` shared logic)
- `netlify/functions/` — Netlify wrappers (same shared logic)
- `functions/` — Cloudflare Pages Functions (same shared logic)
- `vercel.json` / `netlify.toml` / `public/_headers` — routing + wasm headers
