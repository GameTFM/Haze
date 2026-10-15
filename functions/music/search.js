import { musicSearch } from "../../api/_haze.mjs";

export async function onRequest({ request }) {
  const q = String(new URL(request.url).searchParams.get("q") || "").trim();
  if (!q) return Response.json({ error: "Type a song name to search." }, { status: 400 });
  try {
    const limit = new URL(request.url).searchParams.get("limit");
    const results = await musicSearch(q, limit);
    return Response.json(
      { total: results.length, results },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return Response.json({ error: "Search failed — try again." }, { status: 502 });
  }
}
