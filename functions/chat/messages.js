import { chatVerifyToken, chatUserFromAuthHeader, chatStore } from "../../api/_haze.mjs";

const ONLINE_MS = 15000;

export async function onRequest({ request }) {
  const token = chatUserFromAuthHeader(request.headers.get("authorization"));
  const user = token ? await chatVerifyToken(token) : null;
  if (!user) return Response.json({ error: "Log in to read the room." }, { status: 401 });
  const now = Date.now();
  const self = user.userId.startsWith("g_")
    ? chatStore.guests.get(user.userId)
    : chatStore.users.get(user.userId);
  if (self) self.lastSeen = now;

  if (request.method === "GET") {
    for (const [id, t] of chatStore.typing) if (now - t.at > 4000) chatStore.typing.delete(id);
    const url = new URL(request.url);
    const online = [
      ...[...chatStore.users.values()].filter((u) => u.lastSeen && now - u.lastSeen <= ONLINE_MS).map((u) => u.name),
      ...[...chatStore.guests.values()].filter((g) => g.lastSeen && now - g.lastSeen <= ONLINE_MS).map((g) => g.name),
    ];
    const typers = [...chatStore.typing.values()].filter((t) => t.name !== user.name).map((t) => t.name);
    const since = Math.max(parseInt(url.searchParams.get("since") || "") || 0, 0);
    const list = chatStore.messages;
    let start = 0;
    if (since > 0) while (start < list.length && list[start].t <= since) start++;
    else start = Math.max(list.length - 80, 0);
    return Response.json(
      { now, online, typers, messages: list.slice(start) },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  if (request.method === "POST") {
    let body;
    try { body = await request.json(); } catch { body = {}; }
    const text = String(body.text || "").trim();
    if (body.typing === true && !text) {
      chatStore.typing.set(user.userId, { name: user.name, at: now });
      return Response.json({ ok: true });
    }
    if (!text) return Response.json({ error: "Type a message first." }, { status: 400 });
    if (text.length > 500) return Response.json({ error: "Message too long (500 max)." }, { status: 400 });
    chatStore.typing.delete(user.userId);
    const msg = { id: chatStore.randHex(6), u: user.name, text, t: Date.now() };
    if (user.guest) msg.g = true;
    chatStore.messages.push(msg);
    return Response.json({ ok: true, message: msg });
  }

  return Response.json({ error: "GET or POST only." }, { status: 405 });
}
