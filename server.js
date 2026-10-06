// haze server - Scramjet v2 (static vendored files) + wisp transport server
import { createServer } from "node:http";
import { fileURLToPath } from "url";
import { hostname } from "node:os";
import path from "node:path";
import { server as wisp, logging } from "@mercuryworkshop/wisp-js/server";
import express from "express";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicPath = path.join(__dirname, "public");

// ---- local .env fallback (Infisical-delivered env always wins) ----
// Secrets belong in Infisical: `infisical run` injects them as real env vars.
// A plain .env next to server.js is only a convenience fallback for machines
// that aren't wired up yet - env vars that already exist are never overridden,
// and .env is gitignored, so it must never be committed.
try {
  for (const line of readFileSync(path.join(__dirname, ".env"), "utf8").split(/\r?\n/)) {
    if (line.trim().startsWith("#")) continue;
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
} catch {}

// ---- wisp (the websocket transport that carries proxied traffic) ----
logging.set_level(logging.WARN);
Object.assign(wisp.options, {
  allow_udp_streams: false,
  dns_servers: ["1.1.1.1", "1.0.0.1", "8.8.8.8", "8.8.4.4"],
});

const app = express();

// note: no COOP/COEP headers - scramjet v2's transport doesn't need
// SharedArrayBuffer, and COEP require-corp blocks proxied cross-origin frames

// ---- static frontend ----
// everything is vendored under public/ (template layout):
//   /scramjet/scramjet.js + scramjet.wasm   - scramjet 2.0.67-alpha.1 runtime
//   /controller/controller.api|sw|inject.js - matched controller bundle
//   /epoxy/index.js                        - epoxy transport client (static, UMD)
//   /sw.js                                  - service worker (imports controller.sw.js)
// express.send serves .wasm with the application/wasm content type.
app.use(express.static(publicPath));

// ---- music: real catalog search, merged from two public APIs (no keys) ----
// iTunes Search API ranks the real artist's version first and serves 30s
// previews + hi-res art; Deezer adds depth. both are keyless public APIs and
// browser-blocked (no CORS), so the server fetches and merges them.
app.get("/music/search", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) {
    res.status(400).json({ error: "Type a song name to search." });
    return;
  }
  const limit = Math.min(parseInt(String(req.query.limit || "")) || 24, 40);
  const norm = (s) => String(s || "").toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9]+/g, " ").trim();

  const fetchJson = async (url) => {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { "User-Agent": "haze/1.0" } });
    if (!r.ok) throw new Error(`upstream ${r.status}`);
    return r.json();
  };

  // itunes: relevance-ranked, nearly always has a preview + big art
  const itunesPromise = fetchJson(
    `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=song&limit=${Math.ceil(limit / 2)}`
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
    .catch(() => []);

  // deezer: popularity-ranked deep catalog (quirky ranking, but wide)
  const deezerPromise = fetchJson(`https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=${limit}`)
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

  try {
    const [itunesHits, deezerHits] = await Promise.all([itunesPromise, deezerPromise]);
    if (!itunesHits.length && !deezerHits.length) {
      res.status(502).json({ error: "Search failed \u2014 neither catalog was reachable. Try again." });
      return;
    }
    // itunes first (best relevance), then deezer minus near-duplicates
    const seen = new Set();
    const merged = [];
    for (const t of [...itunesHits, ...deezerHits]) {
      if (!t.title || !t.artist) continue;
      const key = `${norm(t.artist)}|${norm(t.title)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(t);
      if (merged.length >= limit) break;
    }
    res.set("Cache-Control", "no-store");
    res.json({ total: merged.length, results: merged });
  } catch (err) {
    res.status(502).json({ error: "Search failed \u2014 try again." });
  }
});

// ---- music: full-song playback via YouTube's official embed player ----
// YouTube serves whole songs from official/topic channels in a keyless,
// login-free embed - the only client-side way to play complete tracks
// without a paid API. this endpoint resolves "artist title" to a videoId.
// many VEVO uploads block embedding, so those are skipped in favor of
// topic/official-audio uploads; if the chosen video still refuses to embed
// the client falls back to the 30s preview. search results are cached for
// a day (only the id matters - audio streams straight from YouTube).
const YT_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const YT_TTL_MS = 24 * 60 * 60 * 1000;
const ytCache = new Map(); // key -> { id: string|null, at: number }
setInterval(() => {
  const cutoff = Date.now() - YT_TTL_MS;
  for (const [k, v] of ytCache) if (v.at < cutoff) ytCache.delete(k);
}, 60 * 60 * 1000).unref();

function ytExtractInitialData(html) {
  const marker = "ytInitialData";
  let idx = html.indexOf(marker);
  while (idx !== -1) {
    const brace = html.indexOf("{", idx + marker.length);
    const close = html.indexOf("</script>", brace);
    if (brace !== -1 && close !== -1) {
      // walk to the matching close-brace (string-aware) and parse just that
      let depth = 0;
      let inStr = false;
      let esc = false;
      let end = -1;
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
          if (depth === 0) {
            end = i + 1;
            break;
          }
        }
      }
      if (end !== -1) {
        try {
          return JSON.parse(html.slice(brace, end));
        } catch {}
      }
    }
    idx = html.indexOf(marker, idx + 1);
  }
  throw new Error("couldn't parse YouTube results");
}

function ytCollectVideos(node, out = []) {
  if (!node || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    for (const x of node) ytCollectVideos(x, out);
    return out;
  }
  const vr = node.videoRenderer;
  if (vr && typeof vr.videoId === "string") {
    const owner =
      vr.ownerText?.runs?.[0]?.text ||
      vr.longBylineText?.runs?.[0]?.text ||
      "";
    out.push({ videoId: vr.videoId, owner: String(owner) });
  }
  for (const v of Object.values(node)) ytCollectVideos(v, out);
  return out;
}

app.get("/music/yt", async (req, res) => {
  const q = String(req.query.q || "").trim().slice(0, 200);
  if (!q) {
    res.status(400).json({ error: "Missing q." });
    return;
  }
  const key = q.toLowerCase();
  const cached = ytCache.get(key);
  if (cached && Date.now() - cached.at < YT_TTL_MS) {
    res.set("Cache-Control", "no-store");
    res.json({ videoId: cached.id });
    return;
  }
  try {
    const r = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&sp=EgIQAQ%3D%3D`,
      { signal: AbortSignal.timeout(8000), headers: { "User-Agent": YT_UA, "Accept-Language": "en-US,en;q=0.9" } }
    );
    if (!r.ok) throw new Error(`upstream ${r.status}`);
    const vids = ytCollectVideos(ytExtractInitialData(await r.text()));
    // first video that isn't a VEVO upload (VEVO blocks embedding) and
    // isn't an hour-long mix; everything else plays full-length in the embed
    let id = null;
    for (const v of vids) {
      const owner = v.owner.toLowerCase();
      if (owner.includes("vevo")) continue;
      id = v.videoId;
      break;
    }
    ytCache.set(key, { id, at: Date.now() });
    res.set("Cache-Control", "no-store");
    res.json({ videoId: id });
  } catch {
    res.status(502).json({ error: "YouTube search failed." });
  }
});

// ---- chat: accounts + global room, zero new deps ----
// passwords are scrypt-hashed with a per-user salt, sessions are HMAC-signed
// tokens (id.exp.sig - stateless, 7d expiry), messages live in a JSON file.
// polling (2s) keeps it dependency-free; nothing here touches the proxy.
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const CHAT_DB_PATH = path.join(__dirname, "chat-data.json");
const CHAT_SECRET = process.env.CHAT_SECRET || randomBytes(32).toString("hex");
const CHAT_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CHAT_NAME_RE = /^[a-zA-Z0-9_\-.]{3,16}$/;
const CHAT_ONLINE_MS = 15000; // presence window for the online-users chip

const chatDb = { users: {}, guests: {}, messages: [], typing: {} };
if (existsSync(CHAT_DB_PATH)) {
  try {
    const saved = JSON.parse(readFileSync(CHAT_DB_PATH, "utf8"));
    if (saved && typeof saved === "object") {
      chatDb.users = saved.users && typeof saved.users === "object" ? saved.users : {};
      chatDb.guests = saved.guests && typeof saved.guests === "object" ? saved.guests : {};
      chatDb.messages = Array.isArray(saved.messages) ? saved.messages : [];
    }
  } catch {}
}
let chatSaveTimer = null;
function chatSave() {
  if (chatSaveTimer) return;
  chatSaveTimer = setTimeout(() => {
    chatSaveTimer = null;
    try {
      writeFileSync(CHAT_DB_PATH, JSON.stringify(chatDb));
    } catch (err) {
      console.error("chat: save failed", err);
    }
  }, 150);
}

function chatHashPassword(password, salt) {
  return scryptSync(String(password), salt, 64).toString("hex");
}

function chatSign(value) {
  return createHmac("sha256", CHAT_SECRET).update(value).digest("base64url");
}

function chatMakeToken(userId) {
  const exp = Date.now() + CHAT_TOKEN_TTL_MS;
  const body = `${userId}.${exp}`;
  return `${body}.${chatSign(body)}`;
}

function chatVerifyToken(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;
  const [userId, expStr, sig] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return null;
  const expected = chatSign(`${userId}.${expStr}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (userId.startsWith("g_")) {
    const guest = chatDb.guests[userId];
    return guest ? { userId, name: guest.name, guest: true } : null;
  }
  const user = chatDb.users[userId];
  return user ? { userId, name: user.name, guest: false } : null;
}

function chatUserFromReq(req) {
  const header = String(req.headers.authorization || "");
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  return token ? chatVerifyToken(token) : null;
}

function chatReadBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => {
      raw += c;
      if (raw.length > 1e5) req.destroy();
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(raw || "{}"));
      } catch {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

const chatPublicUser = (u) => ({ id: u.id, name: u.name, createdAt: u.createdAt });

// register or log in - one endpoint: if the name exists the password must
// match (login), otherwise the account is created (register)
app.post("/chat/auth", async (req, res) => {
  const body = await chatReadBody(req);
  const name = String(body.name || "").trim();
  const password = String(body.password || "");
  if (!CHAT_NAME_RE.test(name)) {
    res.status(400).json({ error: "Name must be 3-16 letters, numbers, _ - or . " });
    return;
  }
  if (password.length < 4) {
    res.status(400).json({ error: "Password needs at least 4 characters." });
    return;
  }
  const key = name.toLowerCase();
  let user = chatDb.users[key];
  if (user) {
    const hash = chatHashPassword(password, user.salt);
    const a = Buffer.from(hash);
    const b = Buffer.from(user.hash);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      res.status(401).json({ error: "That name is taken and the password doesn't match." });
      return;
    }
  } else {
    const salt = randomBytes(16).toString("hex");
    user = {
      id: randomBytes(8).toString("hex"),
      name,
      salt,
      hash: chatHashPassword(password, salt),
      createdAt: Date.now(),
    };
    chatDb.users[key] = user;
    chatSave();
  }
  res.json({ token: chatMakeToken(key), user: chatPublicUser(user) });
});

// one-click guest session - no password. a name typed in the field is claimed
// for the session if free (registered accounts always outrank guests),
// otherwise a random Guest-#### name is picked. guest records are ephemeral:
// they die with their 7-day token, so the name can't be re-claimed later.
app.post("/chat/guest", async (req, res) => {
  const body = await chatReadBody(req);
  const now = Date.now();
  // prune expired guests while we're here
  for (const [gid, guest] of Object.entries(chatDb.guests)) {
    if (now - guest.createdAt > CHAT_TOKEN_TTL_MS) delete chatDb.guests[gid];
  }
  const taken = (n) =>
    Boolean(chatDb.users[n.toLowerCase()]) ||
    Object.values(chatDb.guests).some((g) => g.name.toLowerCase() === n.toLowerCase());
  const wanted = String(body.name || "").trim();
  let name;
  if (CHAT_NAME_RE.test(wanted) && !taken(wanted)) {
    name = wanted;
  } else {
    let candidate = `Guest-${Math.floor(1000 + Math.random() * 9000)}`;
    let guard = 0;
    while (taken(candidate) && guard++ < 20) {
      candidate = `Guest-${Math.floor(1000 + Math.random() * 9000)}`;
    }
    name = candidate;
  }
  const id = `g_${randomBytes(6).toString("hex")}`;
  chatDb.guests[id] = { id, name, createdAt: now };
  chatSave();
  res.json({ token: chatMakeToken(id), user: { id, name, createdAt: now, guest: true } });
});

app.get("/chat/messages", (req, res) => {
  const me = chatUserFromReq(req);
  if (!me) {
    res.status(401).json({ error: "Log in to read the room." });
    return;
  }
  // presence: touching the poll keeps this session "online" (memory only -
  // never persisted, so a restart just shows everyone offline for 15s)
  const now = Date.now();
  if (me.userId.startsWith("g_")) {
    if (chatDb.guests[me.userId]) chatDb.guests[me.userId].lastSeen = now;
  } else if (chatDb.users[me.userId]) {
    chatDb.users[me.userId].lastSeen = now;
  }
  const online = [
    ...Object.values(chatDb.users)
      .filter((u) => u.lastSeen && now - u.lastSeen <= CHAT_ONLINE_MS)
      .map((u) => u.name),
    ...Object.values(chatDb.guests)
      .filter((g) => g.lastSeen && now - g.lastSeen <= CHAT_ONLINE_MS)
      .map((g) => g.name),
  ];
  for (const [tid, typer] of Object.entries(chatDb.typing)) {
    if (now - typer.at > 4000) delete chatDb.typing[tid];
  }
  const typers = Object.values(chatDb.typing)
    .filter((typer) => typer.name !== me.name)
    .map((typer) => typer.name);
  const since = Math.max(parseInt(String(req.query.since || "")) || 0, 0);
  const list = chatDb.messages;
  let start = 0;
  if (since > 0) {
    while (start < list.length && list[start].t <= since) start++;
  } else {
    start = Math.max(list.length - 80, 0);
  }
  res.set("Cache-Control", "no-store");
  res.json({ now, online, typers, messages: list.slice(start) });
});

app.post("/chat/messages", async (req, res) => {
  const me = chatUserFromReq(req);
  if (!me) {
    res.status(401).json({ error: "Log in to speak." });
    return;
  }
  const body = await chatReadBody(req);
  const text = String(body.text || "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim();
  if (!text) {
    res.status(400).json({ error: "Type a message first." });
    return;
  }
  if (text.length > 500) {
    res.status(400).json({ error: "Message too long (500 max)." });
    return;
  }
  if (chatDb.messages.length > 2000) {
    chatDb.messages.splice(0, chatDb.messages.length - 2000);
  }
  if (me.userId.startsWith("g_")) {
    if (chatDb.guests[me.userId]) chatDb.guests[me.userId].lastSeen = Date.now();
  } else if (chatDb.users[me.userId]) {
    chatDb.users[me.userId].lastSeen = Date.now();
  }
  // typing indicator: clients POST {typing:true} while the input has text;
  // entries self-expire after 4s or when a message actually goes out
  const nowTyping = Date.now();
  if (body.typing === true) {
    chatDb.typing[me.userId] = { name: me.name, at: nowTyping };
  } else {
    delete chatDb.typing[me.userId];
  }
  for (const [tid, typer] of Object.entries(chatDb.typing)) {
    if (nowTyping - typer.at > 4000) delete chatDb.typing[tid];
  }
  const msg = { id: randomBytes(6).toString("hex"), u: me.name, text, t: Date.now() };
  if (me.guest) msg.g = true;
  chatDb.messages.push(msg);
  chatSave();
  res.json({ ok: true, message: msg });
});

// ---- games: gn-math library passthroughs ----
// jsDelivr serves the gn-math game wrappers as text/plain, which browsers
// refuse to render in an iframe. these routes fetch from the unbanned
// freebuisness mirror and fix the content-type. covers/catalog come straight
// from the same mirror client-side (they already serve image/png + CORS).
const GAMES_MIRROR = "https://cdn.jsdelivr.net/gh/freebuisness";
const GAMES_ID_RE = /^[a-z0-9_-]+$/i;

app.get("/games/zones.json", async (req, res) => {
  try {
    const r = await fetch(`${GAMES_MIRROR}/assets@main/zones.json`, {
      signal: AbortSignal.timeout(12000),
      headers: { "User-Agent": "haze/1.0" },
    });
    if (!r.ok) throw new Error(`upstream ${r.status}`);
    const text = await r.text();
    res.set("Content-Type", "application/json; charset=utf-8");
    res.set("Cache-Control", "public, max-age=300");
    res.send(text);
  } catch {
    res.status(502).json({ error: "Couldn't fetch the games catalog." });
  }
});

// serve a game wrapper by its real filename (287 games have suffixed
// filenames like 1-fde.html, so the filename comes from the zone entry's
// url field - validated against the catalog, never used raw).
const GAMES_FILE_RE = /^[a-z0-9_-]+\.html$/i;
let gamesCatalog = null;

app.get("/games/play/:file", async (req, res) => {
  const file = String(req.params.file || "").toLowerCase();
  if (!GAMES_FILE_RE.test(file)) {
    res.status(400).send("bad game file");
    return;
  }
  try {
    if (!gamesCatalog) {
      const zr = await fetch(`${GAMES_MIRROR}/assets@main/zones.json`, {
        signal: AbortSignal.timeout(12000),
        headers: { "User-Agent": "haze/1.0" },
      });
      if (!zr.ok) throw new Error(`zones ${zr.status}`);
      gamesCatalog = await zr.json();
    }
    const ok = gamesCatalog.some(
      (g) =>
        g &&
        typeof g.url === "string" &&
        g.url.toLowerCase().endsWith(`/${file}`)
    );
    if (!ok) {
      res.status(404).send("No such game in the catalog.");
      return;
    }
    const r = await fetch(`${GAMES_MIRROR}/html@main/${encodeURIComponent(file)}`, {
      signal: AbortSignal.timeout(12000),
      headers: { "User-Agent": "haze/1.0" },
    });
    if (!r.ok) throw new Error(`upstream ${r.status}`);
    const html = await r.text();
    // no rewriting: the wrappers carry a <base href> pointing at the real
    // asset repo (bubbls/youtube-playables), so relative assets resolve
    // themselves. only the content-type needs fixing.
    res.set("Content-Type", "text/html; charset=utf-8");
    res.set("Cache-Control", "public, max-age=300");
    res.send(html);
  } catch {
    res.status(502).send("Couldn't load that game \u2014 try again.");
  }
});


app.use((req, res) => {
  res.status(404).sendFile(path.join(publicPath, "404.html"));
});

const server = createServer(app);

// ---- wisp rides on the same port, at /wisp/ ----
server.on("upgrade", (req, socket, head) => {
  if (req.url.endsWith("/wisp/")) {
    wisp.routeRequest(req, socket, head);
  } else {
    socket.end();
  }
});

const port = parseInt(process.env.PORT || "") || 8000;
const host = process.env.HOST || "0.0.0.0";

server.listen(port, host, () => {
  console.log("");
  console.log("  haze is up (scramjet v2, static vendored)");
  console.log(`  local   -> http://localhost:${port}`);
  console.log(`  network -> http://${hostname()}:${port}`);
  console.log("");
  console.log("  wisp endpoint: /wisp/");
  console.log("");
});
