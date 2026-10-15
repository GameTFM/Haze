import { youtubeResolve } from "../_haze.mjs";

export default async function handler(req, res) {
  const q = String(req.query.q || "").trim().slice(0, 200);
  if (!q) return res.status(400).json({ error: "Missing q." });
  try {
    const videoId = await youtubeResolve(q);
    res.setHeader("Cache-Control", "no-store");
    return res.json({ videoId });
  } catch {
    return res.status(502).json({ error: "YouTube search failed." });
  }
}
