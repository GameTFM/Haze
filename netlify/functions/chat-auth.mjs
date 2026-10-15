import { chatNameRe, chatMakeToken, chatStore } from "../../api/_haze.mjs";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: JSON.stringify({ error: "POST only." }) };
  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { body = {}; }
  const name = String(body.name || "").trim();
  const password = String(body.password || "");
  if (!chatNameRe.test(name)) return { statusCode: 400, body: JSON.stringify({ error: "Name must be 3-16 letters, numbers, _ - or ." }) };
  if (password.length < 4) return { statusCode: 400, body: JSON.stringify({ error: "Password needs at least 4 characters." }) };
  const key = name.toLowerCase();
  let user = chatStore.users.get(key);
  if (user) {
    if ((await chatStore.pbkdfHash(password, user.salt)) !== user.hash)
      return { statusCode: 401, body: JSON.stringify({ error: "That name is taken and the password doesn't match." }) };
  } else {
    const salt = chatStore.b64url(crypto.getRandomValues(new Uint8Array(16)));
    user = { id: chatStore.randHex(8), name, salt, hash: await chatStore.pbkdfHash(password, salt), createdAt: Date.now() };
    chatStore.users.set(key, user);
  }
  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: await chatMakeToken(key), user: { id: user.id, name: user.name, createdAt: user.createdAt } }) };
};
