/* haze backend config — makes the static frontend host-agnostic.
 *
 * Same-origin defaults keep Docker/Node/VPS working with zero config:
 *   APIs  -> /music/*, /chat/*, /games/*, /ai/relay (same origin)
 *   wisp  -> ws(s)://<host>/wisp/ (same origin)
 *
 * Split hosting (static on Vercel/Netlify/Cloudflare Pages, wisp on a
 * long-lived Node host like Render/Fly) needs only two overrides:
 *   1. hosted API base:  <script>window.__HAZE_API_BASE="https://api.example.com"</script>
 *      before this file, or set localStorage "haze-api-base".
 *   2. wisp backend:     window.__HAZE_WISP_URL="wss://proxy.example.com/wisp/"
 *      or localStorage "haze-wisp-url".
 *
 * Why split? Serverless/edge hosts (Vercel, Netlify, Cloudflare Workers)
 * can't hold the persistent wisp websocket + raw TCP proxy the browsing
 * engine needs. Stateless APIs (music, games catalog, AI relay, ephemeral
 * chat) CAN run serverless — see /api/*, netlify/functions/*, functions/*.
 */
(function () {
  "use strict";
  var w = typeof window !== "undefined" ? window : globalThis;

  function ls(key) {
    try {
      return localStorage.getItem(key) || "";
    } catch {
      return "";
    }
  }

  function apiBase() {
    return (
      w.__HAZE_API_BASE || ls("haze-api-base") || ""
    ).replace(/\/$/, "");
  }

  function api(path) {
    var base = apiBase();
    if (!path.startsWith("/")) path = "/" + path;
    return base + path;
  }

  function defaultWisp() {
    try {
      return (
        (location.protocol === "https:" ? "wss" : "ws") +
        "://" +
        location.host +
        "/wisp/"
      );
    } catch {
      return "/wisp/";
    }
  }

  function wisp() {
    return w.__HAZE_WISP_URL || ls("haze-wisp-url") || defaultWisp();
  }

  w.__HAZE = w.__HAZE || {};
  w.__HAZE.apiBase = apiBase;
  w.HazeApi = api;
  w.HazeWisp = wisp;
})();
