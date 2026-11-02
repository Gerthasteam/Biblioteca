// Búsqueda de cartas en todas las expansiones de un juego (por ahora One
// Piece, que tiene el listado completo) — para la carga rápida por código
// y para agregar cartas a un mazo. ?numbers=OP01-001,OP01-016 devuelve en
// cambio los datos de esas cartas por número (para mostrar un mazo).
import { searchOnePiece, lookupOnePiece } from "../../../../lib/tcgApi";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const game = searchParams.get("game");
  if (game !== "onepiece") return Response.json({ cards: [] });
  try {
    const numbers = (searchParams.get("numbers") || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 80);
    if (numbers.length) return Response.json({ byNumber: await lookupOnePiece(numbers) });
    return Response.json({ cards: await searchOnePiece(searchParams.get("q") || "") });
  } catch {
    return Response.json({ cards: [], error: "fetch_failed" }, { status: 502 });
  }
}
