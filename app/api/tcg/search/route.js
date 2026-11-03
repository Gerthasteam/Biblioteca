// Búsqueda de cartas en todas las expansiones de One Piece (listado completo)
// o de Pokémon (vía su API) — para la carga rápida por código o nombre
// y para agregar cartas a un mazo. ?numbers=OP01-001,OP01-016 devuelve en
// cambio los datos de esas cartas por número (para mostrar un mazo).
import { searchOnePiece, lookupOnePiece, searchPokemon, lookupPokemon } from "../../../../lib/tcgApi";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const game = searchParams.get("game");
  if (game !== "onepiece" && game !== "pokemon") return Response.json({ cards: [] });
  try {
    const numbers = (searchParams.get("numbers") || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 80);
    if (numbers.length) {
      return Response.json({ byNumber: game === "pokemon" ? await lookupPokemon(numbers) : await lookupOnePiece(numbers) });
    }
    const q = searchParams.get("q") || "";
    return Response.json({ cards: game === "pokemon" ? await searchPokemon(q) : await searchOnePiece(q) });
  } catch {
    return Response.json({ cards: [], error: "fetch_failed" }, { status: 502 });
  }
}
