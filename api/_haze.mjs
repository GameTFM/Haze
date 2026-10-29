// Shared helpers for haze serverless APIs (Vercel / Netlify / Cloudflare).
// Stateless + Web-standard: no fs, no Node-only crypto (uses WebCrypto so it
// runs on Node 18+, Vercel, Netlify and Cloudflare Workers alike).
// The full Node server (server.js) remains the only host that runs the wisp
// websocket proxy — serverless hosts serve these stateless APIs + static UI.

export const UA = "haze/1.0";
// music catalogs (Apple/Deezer) reject datacenter requests carrying an
// unknown UA — Cloudflare Workers egress is datacenter space, so the
// catalog fetches pose as a browser. The games mirror accepts anything,
// so it keeps the honest haze UA.
export const MUSIC_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export async function fetchJson(url, timeoutMs = 8000, ua = UA) {
  const r = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "User-Agent": ua, Accept: "application/json" },
  });
  if (!r.ok) throw new Error(`upstream ${r.status}`);
  return r.json();
}

const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export async function musicSearch(q, limit = 24) {
  limit = Math.min(Math.max(parseInt(limit) || 24, 1), 40);    const itunes = fetchJson(
      `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=song&limit=${Math.ceil(limit / 2)}`,
      8000,
      MUSIC_UA
    )
    .then((data) =>
      (data.results || []).map((t) => ({
        title: String(t.trackName || ""),
        artist: String(t.artistName || ""),
        album: String(t.collectionName || ""),
        cover: String(t.artworkUrl100 || "").replace("100x100", "600x600"),
        duration: Math.round((t.trackTimeMillis || 0) / 1000),
        preview: String(t.previewUrl || ""),
        spotify: `https://open.spotify.com/search/${encodeURIComponent(`${t.artistName || ""} ${t.trackName || ""}`)}`,
      }))
    )
    .catch(() => []);    const deezer = fetchJson(
      `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=${limit}`,
      8000,
      MUSIC_UA
    )
    .then((data) =>
      (data.data || [])
        .slice()
        .sort((a, b) => (b.rank || 0) - (a.rank || 0))
        .map((t) => ({
          title: String(t.title || ""),
          artist: String(t.artist?.name || ""),
          album: String(t.album?.title || ""),
          cover: String(t.album?.cover_medium || t.album?.cover_small || ""),
          duration: Number(t.duration) || 0,
          preview: String(t.preview || ""),
          spotify: `https://open.spotify.com/search/${encodeURIComponent(`${t.artist?.name || ""} ${t.title || ""}`)}`,
        }))
    )
    .catch(() => []);
  const [a, b] = await Promise.all([itunes, deezer]);
  if (!a.length && !b.length) throw new Error("neither catalog was reachable");
  const seen = new Set();
  const merged = [];
  for (const t of [...a, ...b]) {
    if (!t.title || !t.artist) continue;
    const key = `${norm(t.artist)}|${norm(t.title)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(t);
    if (merged.length >= limit) break;
  }
  return merged;
}

// ---- YouTube resolver (skips VEVO, embed-blockers tend to be VEVO) ----
const YT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function ytExtractInitialData(html) {
  const marker = "ytInitialData";
  let idx = html.indexOf(marker);
  while (idx !== -1) {
    const brace = html.indexOf("{", idx + marker.length);
    const close = html.indexOf("</script>", brace);
    if (brace !== -1 && close !== -1) {
      let depth = 0, inStr = false, esc = false, end = -1;
      for (let i = brace; i <= close && i < html.length; i++) {
        const ch = html[i];
        if (inStr) {
          if (esc) esc = false;
          else if (ch === "\\") esc = true;
          else if (ch === '"') inStr = false;
          continue;
        }
        if (ch === '"') inStr = true;
        else if (ch === "{") depth++;
        else if (ch === "}") {
          depth--;
          if (depth === 0) { end = i + 1; break; }
        }
      }
      if (end !== -1) {
        try { return JSON.parse(html.slice(brace, end)); } catch {}
      }
    }
    idx = html.indexOf(marker, idx + 1);
  }
  throw new Error("couldn't parse YouTube results");
}

function ytCollect(node, out = []) {
  if (!node || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    for (const x of node) ytCollect(x, out);
    return out;
  }
  const vr = node.videoRenderer;
  if (vr && typeof vr.videoId === "string") {
    const owner = vr.ownerText?.runs?.[0]?.text || vr.longBylineText?.runs?.[0]?.text || "";
    out.push({ videoId: vr.videoId, owner: String(owner) });
  }
  for (const v of Object.values(node)) ytCollect(v, out);
  return out;
}

export async function youtubeResolve(q) {
  const r = await fetch(
    `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&sp=EgIQAQ%3D%3D`,
    { signal: AbortSignal.timeout(8000), headers: { "User-Agent": YT_UA, "Accept-Language": "en-US,en;q=0.9" } }
  );
  if (!r.ok) throw new Error(`upstream ${r.status}`);
  const vids = ytCollect(ytExtractInitialData(await r.text()));
  for (const v of vids) {
    if (v.owner.toLowerCase().includes("vevo")) continue;
    return v.videoId;
  }
  return null;
}

// ---- games mirror ----
export const GAMES_MIRROR = "https://cdn.jsdelivr.net/gh/freebuisness";
export const GAMES_FILE_RE = /^[a-z0-9_-]+\.html$/i;

export async function gamesZonesText() {
  const r = await fetch(`${GAMES_MIRROR}/assets@main/zones.json`, {
    signal: AbortSignal.timeout(12000),
    headers: { "User-Agent": UA },
  });
  if (!r.ok) throw new Error(`upstream ${r.status}`);
  return r.text();
}

// ---- ephemeral chat (serverless has no disk; memory per instance) ----
// NOTE: on Vercel/Netlify/Cloudflare this store resets on cold start /
// scale-out. It keeps the room working with zero config; for persistent
// history point HazeApi at the full Node backend instead.
const users = new Map(); // lower-name -> {id,name,salt,hash,createdAt,lastSeen}
const guests = new Map(); // id -> {id,name,createdAt,lastSeen}
const messages = []; // {id,u,text,t,g?}
const typing = new Map(); // userId -> {name,at}
const SECRET =
  (typeof process !== "undefined" && process.env?.CHAT_SECRET) || "haze-serverless-dev-secret";

const enc = new TextEncoder();
function b64url(bytes) {
  const bin = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function unb64url(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}
async function hmacSign(value) {
  const key = await crypto.subtle.importKey("raw", enc.encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(value)));
}
async function pbkdfHash(password, saltB64) {
  const key = await crypto.subtle.importKey("raw", enc.encode(String(password)), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: unb64url(saltB64), iterations: 100000 },
    key, 256
  );
  return b64url(bits);
}
function randHex(n) {
  return [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, "0")).join("");
}
export const chatNameRe = /^[a-zA-Z0-9_\-.]{3,16}$/;

export async function chatMakeToken(userId) {
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const body = `${userId}.${exp}`;
  return `${body}.${await hmacSign(body)}`;
}
export async function chatVerifyToken(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;
  const [uid, expStr, sig] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return null;
  const want = await hmacSign(`${uid}.${expStr}`);
  if (sig !== want) return null;
  if (uid.startsWith("g_")) {
    const g = guests.get(uid);
    return g ? { userId: uid, name: g.name, guest: true } : null;
  }
  const u = users.get(uid);
  return u ? { userId: uid, name: u.name, guest: false } : null;
}
export function chatUserFromAuthHeader(header) {
  const h = String(header || "");
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}
export const chatStore = { users, guests, messages, typing, randHex, pbkdfHash, b64url };
