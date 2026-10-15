import { chatVerifyToken, chatUserFromAuthHeader, chatStore } from "../../api/_haze.mjs";

const ONLINE_MS = 15000;
const json = (statusCode, obj) => ({ statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(obj) });

export const handler = async (event) => {
  const auth = event.headers?.authorization || event.headers?.Authorization || "";
  const token = chatUserFromAuthHeader(auth);
  const user = token ? await chatVerifyToken(token) : null;
  if (!user) return json(401, { error: "Log in to read the room." });
  const now = Date.now();
  const self = user.userId.startsWith("g_") ? chatStore.guests.get(user.userId) : chatStore.users.get(user.userId);
  if (self) self.lastSeen = now;

  if (event.httpMethod === "GET") {
    for (const [id, t] of chatStore.typing) if (now - t.at > 4000) chatStore.typing.delete(id);
    const online = [
      ...[...chatStore.users.values()].filter((u) => u.lastSeen && now - u.lastSeen <= ONLINE_MS).map((u) => u.name),
      ...[...chatStore.guests.values()].filter((g) => g.lastSeen && now - g.lastSeen <= ONLINE_MS).map((g) => g.name),
    ];
    const typers = [...chatStore.typing.values()].filter((t) => t.name !== user.name).map((t) => t.name);
    const since = Math.max(parseInt(String(event.queryStringParameters?.since || "")) || 0, 0);
    const list = chatStore.messages;
    let start = 0;
    if (since > 0) while (start < list.length && list[start].t <= since) start++;
    else start = Math.max(list.length - 80, 0);
    return json(200, { now, online, typers, messages: list.slice(start) });
  }

  if (event.httpMethod === "POST") {
    let body;
    try { body = JSON.parse(event.body || "{}"); } catch { body = {}; }
    const text = String(body.text || "").trim();
    if (body.typing === true && !text) {
      chatStore.typing.set(user.userId, { name: user.name, at: now });
      return json(200, { ok: true });
    }
    if (!text) return json(400, { error: "Type a message first." });
    if (text.length > 500) return json(400, { error: "Message too long (500 max)." });
    chatStore.typing.delete(user.userId);
    const msg = { id: chatStore.randHex(6), u: user.name, text, t: Date.now() };
    if (user.guest) msg.g = true;
    chatStore.messages.push(msg);
    return json(200, { ok: true, message: msg });
  }

  return json(405, { error: "GET or POST only." });
};
