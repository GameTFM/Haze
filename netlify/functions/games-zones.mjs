import { gamesZonesText } from "../../api/_haze.mjs";

export const handler = async () => {
  try {
    const text = await gamesZonesText();
    return { statusCode: 200, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=300" }, body: text };
  } catch {
    return { statusCode: 502, body: JSON.stringify({ error: "Couldn't fetch the games catalog." }) };
  }
};
