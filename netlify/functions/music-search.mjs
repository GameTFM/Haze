import { musicSearch } from "../../api/_haze.mjs";

export const handler = async (event) => {
  const q = String(event.queryStringParameters?.q || "").trim();
  if (!q) return { statusCode: 400, body: JSON.stringify({ error: "Type a song name to search." }) };
  try {
    const results = await musicSearch(q, event.queryStringParameters?.limit);
    return { statusCode: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify({ total: results.length, results }) };
  } catch {
    return { statusCode: 502, body: JSON.stringify({ error: "Search failed — try again." }) };
  }
};
