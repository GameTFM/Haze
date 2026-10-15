import { chatNameRe, chatMakeToken, chatStore } from "../_haze.mjs";

// POST {name?} — ephemeral guest session.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only." });
  const taken = (n) =>
    chatStore.users.has(n.toLowerCase()) ||
    [...chatStore.guests.values()].some((g) => g.name.toLowerCase() === n.toLowerCase());
  const wanted = String(req.body?.name || "").trim();
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
  return res.json({
    token: await chatMakeToken(id),
    user: { id, name, createdAt: now, guest: true },
  });
}
