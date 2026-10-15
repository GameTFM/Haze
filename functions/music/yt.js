import { youtubeResolve } from "../../api/_haze.mjs";

export async function onRequest({ request }) {
  const q = String(new URL(request.url).searchParams.get("q") || "").trim().slice(0, 200);
  if (!q) return Response.json({ error: "Missing q." }, { status: 400 });
  try {
    const videoId = await youtubeResolve(q);
    return Response.json({ videoId }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "YouTube search failed." }, { status: 502 });
  }
}
