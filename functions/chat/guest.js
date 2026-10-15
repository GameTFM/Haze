import { chatNameRe, chatMakeToken, chatStore } from "../../api/_haze.mjs";

export async function onRequest({ request }) {
  if (request.method !== "POST") return Response.json({ error: "POST only." }, { status: 405 });
  let body;
  try { body = await request.json(); } catch { body = {}; }
  const taken = (n) =>
    chatStore.users.has(n.toLowerCase()) ||
    [...chatStore.guests.values()].some((g) => g.name.toLowerCase() === n.toLowerCase());
  const wanted = String(body.name || "").trim();
  let name;
  if (chatNameRe.test(wanted) && !taken(wanted)) name = wanted;
  else {
    let c = `Guest-${Math.floor(1000 + Math.random() * 9000)}`, guard = 0;
    while (taken(c) && guard++ < 20) c = `Guest-${Math.floor(1000 + Math.random() * 9000)}`;
    name = c;
  }
  const id = `g_${chatStore.randHex(6)}`;
  const now = Date.now();
  chatStore.guests.set(id, { id, name, createdAt: now });
  return Response.json({
    token: await chatMakeToken(id),
    user: { id, name, createdAt: now, guest: true },
  });
}
