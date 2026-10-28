// ../OneDrive/Desktop/haze/api/_haze.mjs
var UA = "haze/1.0";
var MUSIC_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
async function fetchJson(url, timeoutMs = 8e3, ua = UA) {
  const r = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "User-Agent": ua, Accept: "application/json" }
  });
  if (!r.ok) throw new Error(`upstream ${r.status}`);
  return r.json();
}
var norm = (s) => String(s || "").toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9]+/g, " ").trim();
async function musicSearch(q, limit = 24) {
  limit = Math.min(Math.max(parseInt(limit) || 24, 1), 40);
  const itunes = fetchJson(
    `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=song&limit=${Math.ceil(limit / 2)}`,
    8e3,
    MUSIC_UA
  ).then(
    (data) => (data.results || []).map((t) => ({
      title: String(t.trackName || ""),
      artist: String(t.artistName || ""),
      album: String(t.collectionName || ""),
      cover: String(t.artworkUrl100 || "").replace("100x100", "600x600"),
      duration: Math.round((t.trackTimeMillis || 0) / 1e3),
      preview: String(t.previewUrl || ""),
      spotify: `https://open.spotify.com/search/${encodeURIComponent(`${t.artistName || ""} ${t.trackName || ""}`)}`
    }))
  ).catch(() => []);
  const deezer = fetchJson(
    `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=${limit}`,
    8e3,
    MUSIC_UA
  ).then(
    (data) => (data.data || []).slice().sort((a2, b2) => (b2.rank || 0) - (a2.rank || 0)).map((t) => ({
      title: String(t.title || ""),
      artist: String(t.artist?.name || ""),
      album: String(t.album?.title || ""),
      cover: String(t.album?.cover_medium || t.album?.cover_small || ""),
      duration: Number(t.duration) || 0,
      preview: String(t.preview || ""),
      spotify: `https://open.spotify.com/search/${encodeURIComponent(`${t.artist?.name || ""} ${t.title || ""}`)}`
    }))
  ).catch(() => []);
  const [a, b] = await Promise.all([itunes, deezer]);
  if (!a.length && !b.length) throw new Error("neither catalog was reachable");
  const seen = /* @__PURE__ */ new Set();
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
var YT_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
function ytExtractInitialData(html) {
  const marker = "ytInitialData";
  let idx = html.indexOf(marker);
  while (idx !== -1) {
    const brace = html.indexOf("{", idx + marker.length);
    const close = html.indexOf("<\/script>", brace);
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
          if (depth === 0) {
            end = i + 1;
            break;
          }
        }
      }
      if (end !== -1) {
        try {
          return JSON.parse(html.slice(brace, end));
        } catch {
        }
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
async function youtubeResolve(q) {
  const r = await fetch(
    `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&sp=EgIQAQ%3D%3D`,
    { signal: AbortSignal.timeout(8e3), headers: { "User-Agent": YT_UA, "Accept-Language": "en-US,en;q=0.9" } }
  );
  if (!r.ok) throw new Error(`upstream ${r.status}`);
  const vids = ytCollect(ytExtractInitialData(await r.text()));
  for (const v of vids) {
    if (v.owner.toLowerCase().includes("vevo")) continue;
    return v.videoId;
  }
  return null;
}
var GAMES_MIRROR = "https://cdn.jsdelivr.net/gh/freebuisness";
var GAMES_FILE_RE = /^[a-z0-9_-]+\.html$/i;
async function gamesZonesText() {
  const r = await fetch(`${GAMES_MIRROR}/assets@main/zones.json`, {
    signal: AbortSignal.timeout(12e3),
    headers: { "User-Agent": UA }
  });
  if (!r.ok) throw new Error(`upstream ${r.status}`);
  return r.text();
}
var users = /* @__PURE__ */ new Map();
var guests = /* @__PURE__ */ new Map();
var messages = [];
var typing = /* @__PURE__ */ new Map();
var reacts = /* @__PURE__ */ new Map(); // messageId -> Map(emoji -> Set(userId))
var REACT_EMOJIS = ["\u2764\ufe0f", "\ud83d\ude02", "\ud83d\udc4d", "\ud83d\udd25", "\ud83d\ude32"]; // love laugh thumbsup fire wow
var SECRET = typeof process !== "undefined" && process.env?.CHAT_SECRET || "haze-serverless-dev-secret";
var enc = new TextEncoder();
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
    { name: "PBKDF2", hash: "SHA-256", salt: unb64url(saltB64), iterations: 1e5 },
    key,
    256
  );
  return b64url(bits);
}
function randHex(n) {
  return [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, "0")).join("");
}
var chatNameRe = /^[a-zA-Z0-9_\-.]{3,16}$/;
async function chatMakeToken(userId) {
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1e3;
  const body = `${userId}.${exp}`;
  return `${body}.${await hmacSign(body)}`;
}
async function chatVerifyToken(token) {
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
function chatUserFromAuthHeader(header) {
  const h = String(header || "");
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}
var chatStore = { users, guests, messages, typing, reacts, REACT_EMOJIS, randHex, pbkdfHash, b64url };

// ../OneDrive/Desktop/haze/worker.js
var ONLINE_MS = 15e3;
var json = (data, status = 200, headers = {}) => Response.json(data, { status, headers });
async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
var routes = {
  // ---- music ----
  async musicSearch(url) {
    const q = String(url.searchParams.get("q") || "").trim();
    if (!q) return json({ error: "Type a song name to search." }, 400);
    try {
      const results = await musicSearch(q, url.searchParams.get("limit"));
      return json(
        { total: results.length, results },
        200,
        { "Cache-Control": "no-store" }
      );
    } catch {
      return json({ error: "Search failed \u2014 try again." }, 502);
    }
  },
  async musicYt(url) {
    const q = String(url.searchParams.get("q") || "").trim().slice(0, 200);
    if (!q) return json({ error: "Missing q." }, 400);
    try {
      const videoId = await youtubeResolve(q);
      return json({ videoId }, 200, { "Cache-Control": "no-store" });
    } catch {
      return json({ error: "YouTube search failed." }, 502);
    }
  },
  // ---- chat ----
  async chatAuth(request) {
    if (request.method !== "POST") return json({ error: "POST only." }, 405);
    const body = await readBody(request);
    const name = String(body.name || "").trim();
    const password = String(body.password || "");
    if (!chatNameRe.test(name))
      return json({ error: "Name must be 3-16 letters, numbers, _ - or ." }, 400);
    if (password.length < 4)
      return json({ error: "Password needs at least 4 characters." }, 400);
    const key = name.toLowerCase();
    let user = chatStore.users.get(key);
    if (user) {
      if (await chatStore.pbkdfHash(password, user.salt) !== user.hash)
        return json({ error: "That name is taken and the password doesn't match." }, 401);
    } else {
      const salt = chatStore.b64url(crypto.getRandomValues(new Uint8Array(16)));
      user = {
        id: chatStore.randHex(8),
        name,
        salt,
        hash: await chatStore.pbkdfHash(password, salt),
        createdAt: Date.now()
      };
      chatStore.users.set(key, user);
    }
    return json({
      token: await chatMakeToken(key),
      user: { id: user.id, name: user.name, createdAt: user.createdAt }
    });
  },
  async chatGuest(request) {
    if (request.method !== "POST") return json({ error: "POST only." }, 405);
    const body = await readBody(request);
    const taken = (n) => chatStore.users.has(n.toLowerCase()) || [...chatStore.guests.values()].some(
      (g) => g.name.toLowerCase() === n.toLowerCase()
    );
    const wanted = String(body.name || "").trim();
    let name;
    if (chatNameRe.test(wanted) && !taken(wanted)) name = wanted;
    else {
      let c = `Guest-${Math.floor(1e3 + Math.random() * 9e3)}`, guard = 0;
      while (taken(c) && guard++ < 20)
        c = `Guest-${Math.floor(1e3 + Math.random() * 9e3)}`;
      name = c;
    }
    const id = `g_${chatStore.randHex(6)}`;
    const now = Date.now();
    chatStore.guests.set(id, { id, name, createdAt: now });
    return json({
      token: await chatMakeToken(id),
      user: { id, name, createdAt: now, guest: true }
    });
  },
  async chatMessages(request, url) {
    const token = chatUserFromAuthHeader(request.headers.get("authorization"));
    const user = token ? await chatVerifyToken(token) : null;
    if (!user) return json({ error: "Log in to read the room." }, 401);
    const now = Date.now();
    const self = user.userId.startsWith("g_") ? chatStore.guests.get(user.userId) : chatStore.users.get(user.userId);
    if (self) self.lastSeen = now;
    if (request.method === "GET") {
      for (const [id, t] of chatStore.typing)
        if (now - t.at > 4e3) chatStore.typing.delete(id);
      const online = [
        ...[...chatStore.users.values()].filter((u) => u.lastSeen && now - u.lastSeen <= ONLINE_MS).map((u) => u.name),
        ...[...chatStore.guests.values()].filter((g) => g.lastSeen && now - g.lastSeen <= ONLINE_MS).map((g) => g.name)
      ];
      const typers = [...chatStore.typing.values()].filter((t) => t.name !== user.name).map((t) => t.name);
      const since = Math.max(parseInt(url.searchParams.get("since") || "") || 0, 0);
      const list = chatStore.messages;
      let start = 0;
      if (since > 0) while (start < list.length && list[start].t <= since) start++;
      else start = Math.max(list.length - 80, 0);
      // reactions ride along with each message: r = { "👍": 3 },
      // mine = ["❤️"] is this user's own active reactions (for the highlight)
      const out = [];
      for (let i = start; i < list.length; i++) {
        const m = list[i];
        const rx = chatStore.reacts.get(m.id);
        if (!rx) { out.push(m); continue; }
        const r = {};
        const mine = [];
        for (const [emoji, who] of rx) {
          if (!who.size) continue;
          r[emoji] = who.size;
          if (who.has(user.userId)) mine.push(emoji);
        }
        if (mine.length) out.push({ ...m, r, mine });
        else if (Object.keys(r).length) out.push({ ...m, r });
        else out.push(m);
      }
      // late reaction changes on older messages: every currently-reacted
      // message (up to 200 back) rides along so existing clients update
      const reacted = [];
      const ra = Math.max(list.length - 200, 0);
      for (let i = ra; i < list.length; i++) {
        const m = list[i];
        const rx = chatStore.reacts.get(m.id);
        if (!rx) continue;
        const r = {};
        const mine = [];
        for (const [emoji, who] of rx)
          if (who.size) { r[emoji] = who.size; if (who.has(user.userId)) mine.push(emoji); }
        if (Object.keys(r).length) reacted.push({ id: m.id, r, mine });
      }
      return json(
        { now, online, typers, messages: out, reacted },
        200,
        { "Cache-Control": "no-store" }
      );
    }
    if (request.method === "POST") {
      const body = await readBody(request);
      const text = String(body.text || "").trim();
      if (body.typing === true && !text) {
        chatStore.typing.set(user.userId, { name: user.name, at: now });
        return json({ ok: true });
      }
      if (!text) return json({ error: "Type a message first." }, 400);
      if (text.length > 500)
        return json({ error: "Message too long (500 max)." }, 400);
      chatStore.typing.delete(user.userId);
      const msg = { id: chatStore.randHex(6), u: user.name, text, t: Date.now() };
      if (user.guest) msg.g = true;
      chatStore.messages.push(msg);
      return json({ ok: true, message: msg });
    }
    return json({ error: "GET or POST only." }, 405);
  },
  // ---- chat reactions ----
  // POST { id, emoji } toggles the caller's reaction on that message.
  // Only message authors can react to their own message? No - anyone reacts
  // to anything; guests and accounts alike.
  async chatReact(request) {
    if (request.method !== "POST") return json({ error: "POST only." }, 405);
    const token = chatUserFromAuthHeader(request.headers.get("authorization"));
    const user = token ? await chatVerifyToken(token) : null;
    if (!user) return json({ error: "Log in first." }, 401);
    const body = await readBody(request);
    const id = String(body.id || "");
    const emoji = String(body.emoji || "");
    if (!chatStore.REACT_EMOJIS.includes(emoji))
      return json({ error: "Unknown reaction." }, 400);
    const msg = chatStore.messages.find((m) => m.id === id);
    if (!msg) return json({ error: "Message no longer exists." }, 404);
    let rx = chatStore.reacts.get(id);
    if (!rx) { rx = new Map(); chatStore.reacts.set(id, rx); }
    let who = rx.get(emoji);
    if (!who) { who = new Set(); rx.set(emoji, who); }
    let on;
    if (who.has(user.userId)) { who.delete(user.userId); on = false; }
    else { who.add(user.userId); on = true; }
    // compact: drop empty emoji rows and empty maps
    if (!who.size) rx.delete(emoji);
    if (!rx.size) chatStore.reacts.delete(id);
    const r = {};
    const rx2 = chatStore.reacts.get(id);
    const mine = [];
    if (rx2) for (const [e2, who2] of rx2) if (who2.size) { r[e2] = who2.size; if (who2.has(user.userId)) mine.push(e2); }
    return json({ ok: true, id, r, mine, on });
  },
  // ---- games ----
  async gamesZones() {
    try {
      const text = await gamesZonesText();
      return new Response(text, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "public, max-age=300"
        }
      });
    } catch {
      return json({ error: "Couldn't fetch the games catalog." }, 502);
    }
  },
  async gamesPlay(file) {
    const f = String(file || "").toLowerCase();
    if (!GAMES_FILE_RE.test(f)) return new Response("bad game file", { status: 400 });
    try {
      // Any valid filename on the freebuisness/html mirror plays. The zones
      // catalog is a curated subset; the flux reference (blockfreeubg/flux)
      // points at the same mirror for its larger 3.3k-game catalog, so the
      // whitelist no longer limits what can launch.
      const r = await fetch(`${GAMES_MIRROR}/html@main/${encodeURIComponent(f)}`, {
        signal: AbortSignal.timeout(12e3),
        headers: { "User-Agent": "haze/1.0" }
      });
      if (!r.ok) throw new Error(`upstream ${r.status}`);
      return new Response(await r.text(), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=300"
        }
      });
    } catch {
      return new Response("Couldn't load that game \u2014 try again.", { status: 502 });
    }
  },
  // ---- AI relay ----
  async aiRelay(request) {
    if (request.method !== "POST") return json({ error: "POST only." }, 405);
    const body = await readBody(request);
    const { model, messages: messages2 } = body || {};
    if (!Array.isArray(messages2) || !messages2.length)
      return json({ error: "messages required" }, 400);
    const wanted = typeof model === "string" && /^[\w.-]{1,64}$/.test(model) ? model : "openai-fast";
    const callUpstream = (m) => fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: m, messages: messages2, stream: true, referrer: "haze" }),
      signal: AbortSignal.timeout(6e4)
    });
    try {
      let upstream = await callUpstream(wanted);
      if (!upstream.ok && [402, 403, 404].includes(upstream.status) && wanted !== "openai-fast")
        upstream = await callUpstream("openai-fast");
      if (!upstream.ok)
        return new Response(await upstream.text().catch(() => ""), {
          status: upstream.status
        });
      return new Response(upstream.body, {
        status: 200,
        headers: {
          "Content-Type": upstream.headers.get("content-type") || "text/event-stream"
        }
      });
    } catch (e) {
      return json({ error: String(e?.message || e) }, 502);
    }
  },
  // ---- online presence (heartbeat count) ----
  async onlineBeat(url) {
    const cid = String(url.searchParams.get("cid") || "").replace(/[^\w-]/g, "").slice(0, 64);
    const now = Date.now();
    if (cid) onlineCid.set(cid, now);
    for (const [k, t] of onlineCid) if (now - t > ONLINE_TTL) onlineCid.delete(k);
    return json({ online: onlineCid.size, now }, 200, { "Cache-Control": "no-store" });
  }
};
var ONLINE_TTL = 75e3;
var onlineCid = new Map();
var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;
    if (p === "/music/search") return routes.musicSearch(url);
    if (p === "/music/yt") return routes.musicYt(url);
    if (p === "/chat/auth") return routes.chatAuth(request);
    if (p === "/chat/guest") return routes.chatGuest(request);
    if (p === "/chat/messages") return routes.chatMessages(request, url);
    if (p === "/chat/react") return routes.chatReact(request);
    if (p === "/games/zones.json") return routes.gamesZones();
    if (p.startsWith("/games/play/"))
      return routes.gamesPlay(decodeURIComponent(p.slice("/games/play/".length).split("/")[0]));
    if (p === "/ai/relay") return routes.aiRelay(request);
    if (p === "/api/online") return routes.onlineBeat(url);
    return env.ASSETS.fetch(request);
  }
};
export {
  worker_default as default
};
