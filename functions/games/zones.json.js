import { gamesZonesText } from "../../api/_haze.mjs";

export async function onRequest() {
  try {
    const text = await gamesZonesText();
    return new Response(text, {
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=300" },
    });
  } catch {
    return Response.json({ error: "Couldn't fetch the games catalog." }, { status: 502 });
  }
}
