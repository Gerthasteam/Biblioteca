// Precios de mercado (USD, TCGplayer) de las cartas de un juego, por clave
// de carta — para el valor de la colección en la grilla de juegos y en
// cada carpeta. One Piece trae todos de una; Pokémon va set por set
// (?sets=base1,sv3), así que solo se piden los sets que tenés.
import { getOnePiecePrices, getPokemonCards } from "../../../../lib/tcgApi";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const game = searchParams.get("game");
  try {
    if (game === "onepiece") return Response.json({ prices: await getOnePiecePrices() });
    if (game === "pokemon") {
      const sets = (searchParams.get("sets") || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 40);
      const prices = {};
      const results = await Promise.allSettled(sets.map((s) => getPokemonCards(s)));
      for (const r of results) {
        if (r.status !== "fulfilled") continue;
        for (const c of r.value) if (c.price != null) prices[c.id] = c.price;
      }
      return Response.json({ prices });
    }
    return Response.json({ prices: {} });
  } catch {
    return Response.json({ prices: {}, error: "fetch_failed" }, { status: 502 });
  }
}
