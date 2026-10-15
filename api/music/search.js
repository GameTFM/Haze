import { musicSearch } from "../_haze.mjs";

export default async function handler(req, res) {
  const q = String(req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "Type a song name to search." });
  try {
    const results = await musicSearch(q, req.query.limit);
    res.setHeader("Cache-Control", "no-store");
    return res.json({ total: results.length, results });
  } catch {
    return res.status(502).json({ error: "Search failed — try again." });
  }
}
