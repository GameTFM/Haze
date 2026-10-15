import { chatNameRe, chatMakeToken, chatStore } from "../../api/_haze.mjs";

export async function onRequest({ request }) {
  if (request.method !== "POST") return Response.json({ error: "POST only." }, { status: 405 });
  let body;
  try { body = await request.json(); } catch { body = {}; }
  const name = String(body.name || "").trim();
  const password = String(body.password || "");
  if (!chatNameRe.test(name))
    return Response.json({ error: "Name must be 3-16 letters, numbers, _ - or ." }, { status: 400 });
  if (password.length < 4)
    return Response.json({ error: "Password needs at least 4 characters." }, { status: 400 });
  const key = name.toLowerCase();
  let user = chatStore.users.get(key);
  if (user) {
    if ((await chatStore.pbkdfHash(password, user.salt)) !== user.hash)
      return Response.json({ error: "That name is taken and the password doesn't match." }, { status: 401 });
  } else {
    const salt = chatStore.b64url(crypto.getRandomValues(new Uint8Array(16)));
    user = { id: chatStore.randHex(8), name, salt, hash: await chatStore.pbkdfHash(password, salt), createdAt: Date.now() };
    chatStore.users.set(key, user);
  }
  return Response.json({
    token: await chatMakeToken(key),
    user: { id: user.id, name: user.name, createdAt: user.createdAt },
  });
}
