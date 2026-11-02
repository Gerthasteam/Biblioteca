// Todas las cartas de todas las expansiones de One Piece, con su set — para
// "Exportar todas" (crea de una las carpetas de todos los sets).
import { getOnePieceAll } from "../../../../lib/tcgApi";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("game") !== "onepiece") return Response.json({ cards: [] });
  try {
    const cards = (await getOnePieceAll())
      .filter((c) => c.setId)
      .map((c) => ({ id: c.id, title: c.title, setId: c.setId, setName: c.setName, cover: c.cover }));
    return Response.json({ cards });
  } catch {
    return Response.json({ cards: [], error: "fetch_failed" }, { status: 502 });
  }
}
