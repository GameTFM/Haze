import { youtubeResolve } from "../../api/_haze.mjs";

export const handler = async (event) => {
  const q = String(event.queryStringParameters?.q || "").trim().slice(0, 200);
  if (!q) return { statusCode: 400, body: JSON.stringify({ error: "Missing q." }) };
  try {
    const videoId = await youtubeResolve(q);
    return { statusCode: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify({ videoId }) };
  } catch {
    return { statusCode: 502, body: JSON.stringify({ error: "YouTube search failed." }) };
  }
};
