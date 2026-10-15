import { gamesZonesText } from "../_haze.mjs";

export default async function handler(req, res) {
  try {
    const text = await gamesZonesText();
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");
    return res.send(text);
  } catch {
    return res.status(502).json({ error: "Couldn't fetch the games catalog." });
  }
}
