// POST /ai/relay -> streams Pollinations SSE straight through (no buffering).
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only." });
  const { model, messages } = req.body || {};
  if (!Array.isArray(messages) || !messages.length)
    return res.status(400).json({ error: "messages required" });
  const wanted = typeof model === "string" && /^[\w.-]{1,64}$/.test(model) ? model : "openai-fast";
  async function callUpstream(m) {
    return fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: m, messages, stream: true, referrer: "haze" }),
      signal: AbortSignal.timeout(120000),
    });
  }
  try {
    let upstream = await callUpstream(wanted);
    if (!upstream.ok && [402, 403, 404].includes(upstream.status) && wanted !== "openai-fast")
      upstream = await callUpstream("openai-fast");
    if (!upstream.ok) {
      const t = await upstream.text().catch(() => "");
      return res.status(upstream.status).send(t || JSON.stringify({ error: "upstream error" }));
    }
    res.status(200);
    const ct = upstream.headers.get("content-type");
    if (ct) res.setHeader("Content-Type", ct);
    if (upstream.body) {
      for await (const chunk of upstream.body) res.write(chunk);
      return res.end();
    }
    return res.end();
  } catch (e) {
    return res.status(502).json({ error: String(e?.message || e) });
  }
}
