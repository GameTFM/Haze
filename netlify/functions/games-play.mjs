import { GAMES_MIRROR, GAMES_FILE_RE, gamesZonesText } from "../../api/_haze.mjs";

let catalog = null;

export const handler = async (event) => {
  // redirect sends /games/play/<file> here; pull filename from path or ?file=
  const raw = event.path || "";
  const fromPath = raw.split("/").pop() || "";
  const file = String(event.queryStringParameters?.file || fromPath).toLowerCase();
  if (!GAMES_FILE_RE.test(file)) return { statusCode: 400, body: "bad game file" };
  try {
    if (!catalog) catalog = JSON.parse(await gamesZonesText());
    const ok = catalog.some((g) => g && typeof g.url === "string" && g.url.toLowerCase().endsWith(`/${file}`));
    if (!ok) return { statusCode: 404, body: "No such game in the catalog." };
    const r = await fetch(`${GAMES_MIRROR}/html@main/${encodeURIComponent(file)}`, {
      signal: AbortSignal.timeout(12000),
      headers: { "User-Agent": "haze/1.0" },
    });
    if (!r.ok) throw new Error(`upstream ${r.status}`);
    return { statusCode: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300" }, body: await r.text() };
  } catch {
    return { statusCode: 502, body: "Couldn't load that game — try again." };
  }
};
