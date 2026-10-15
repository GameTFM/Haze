// Netlify has a ~10s sync limit on free — streaming relay may truncate on
// very long generations; the full Node backend has no such limit.
export const handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: JSON.stringify({ error: "POST only." }) };
  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { body = {}; }
  const { model, messages } = body;
  if (!Array.isArray(messages) || !messages.length)
    return { statusCode: 400, body: JSON.stringify({ error: "messages required" }) };
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
    if (!upstream.ok) return { statusCode: upstream.status, body: (await upstream.text().catch(() => "")) || "{}" };
    return { statusCode: 200, headers: { "Content-Type": upstream.headers.get("content-type") || "text/event-stream" }, body: await upstream.text() };
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ error: String(e?.message || e) }) };
  }
};
