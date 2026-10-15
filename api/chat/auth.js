import { chatNameRe, chatMakeToken, chatStore } from "../_haze.mjs";

// POST {name, password} — register-or-login. Ephemeral on serverless.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only." });
  const name = String(req.body?.name || "").trim();
  const password = String(req.body?.password || "");
  if (!chatNameRe.test(name))
    return res.status(400).json({ error: "Name must be 3-16 letters, numbers, _ - or ." });
  if (password.length < 4)
    return res.status(400).json({ error: "Password needs at least 4 characters." });
  const key = name.toLowerCase();
  let user = chatStore.users.get(key);
  if (user) {
    const hash = await chatStore.pbkdfHash(password, user.salt);
    if (hash !== user.hash)
      return res.status(401).json({ error: "That name is taken and the password doesn't match." });
  } else {
    const salt = chatStore.b64url(crypto.getRandomValues(new Uint8Array(16)));
    user = {
      id: chatStore.randHex(8), name,
      salt, hash: await chatStore.pbkdfHash(password, salt),
      createdAt: Date.now(),
    };
    chatStore.users.set(key, user);
  }
  return res.json({
    token: await chatMakeToken(key),
    user: { id: user.id, name: user.name, createdAt: user.createdAt },
  });
}
