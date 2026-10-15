export async function onRequest({ request }) {
  if (request.method !== "POST") return Response.json({ error: "POST only." }, { status: 405 });
  let body;
  try { body = await request.json(); } catch { body = {}; }
  const { model, messages } = body || {};
  if (!Array.isArray(messages) || !messages.length)
    return Response.json({ error: "messages required" }, { status: 400 });
  const wanted = typeof model === "string" && /^[\w.-]{1,64}$/.test(model) ? model : "openai-fast";
  async function callUpstream(m) {
    return fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: m, messages, stream: true, referrer: "haze" }),
      signal: AbortSignal.timeout(60000),
    });
  }
  try {
    let upstream = await callUpstream(wanted);
    if (!upstream.ok && [402, 403, 404].includes(upstream.status) && wanted !== "openai-fast")
      upstream = await callUpstream("openai-fast");
    if (!upstream.ok)
      return new Response(await upstream.text().catch(() => ""), { status: upstream.status });
    return new Response(upstream.body, {
      status: 200,
      headers: { "Content-Type": upstream.headers.get("content-type") || "text/event-stream" },
    });
  } catch (e) {
    return Response.json({ error: String(e?.message || e) }, { status: 502 });
  }
}
