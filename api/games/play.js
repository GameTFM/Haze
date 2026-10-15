import { GAMES_MIRROR, GAMES_FILE_RE, gamesZonesText } from "../_haze.mjs";

let catalog = null;

export default async function handler(req, res) {
  const file = String(req.query.file || "").toLowerCase();
  if (!GAMES_FILE_RE.test(file)) return res.status(400).send("bad game file");
  try {
    if (!catalog) catalog = JSON.parse(await gamesZonesText());
    const ok = catalog.some(
      (g) => g && typeof g.url === "string" && g.url.toLowerCase().endsWith(`/${file}`)
    );
    if (!ok) return res.status(404).send("No such game in the catalog.");
    const r = await fetch(`${GAMES_MIRROR}/html@main/${encodeURIComponent(file)}`, {
      signal: AbortSignal.timeout(12000),
      headers: { "User-Agent": "haze/1.0" },
    });
    if (!r.ok) throw new Error(`upstream ${r.status}`);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");
    return res.send(await r.text());
  } catch {
    return res.status(502).send("Couldn't load that game — try again.");
  }
}
