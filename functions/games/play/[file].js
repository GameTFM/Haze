import { GAMES_MIRROR, GAMES_FILE_RE, gamesZonesText } from "../../../api/_haze.mjs";

let catalog = null;

export async function onRequest({ params }) {
  const file = String(params?.file || "").toLowerCase();
  if (!GAMES_FILE_RE.test(file)) return new Response("bad game file", { status: 400 });
  try {
    if (!catalog) catalog = JSON.parse(await gamesZonesText());
    const ok = catalog.some((g) => g && typeof g.url === "string" && g.url.toLowerCase().endsWith(`/${file}`));
    if (!ok) return new Response("No such game in the catalog.", { status: 404 });
    const r = await fetch(`${GAMES_MIRROR}/html@main/${encodeURIComponent(file)}`, {
      signal: AbortSignal.timeout(12000),
      headers: { "User-Agent": "haze/1.0" },
    });
    if (!r.ok) throw new Error(`upstream ${r.status}`);
    return new Response(await r.text(), {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300" },
    });
  } catch {
    return new Response("Couldn't load that game — try again.", { status: 502 });
  }
}
