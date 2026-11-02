// Cartas de un set/expansión puntual, para el paso 3 del asistente de carga
// (elegir la carta después de elegir juego y set), para "Carpeta TCG" y
// para la vista de lista de una carpeta (rareza, color, paralelas, precio).
import { getCards } from "../../../../lib/tcgApi";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const game = searchParams.get("game");
  const set = (searchParams.get("set") || "").trim();
  if (!set) return Response.json({ cards: [] });

  try {
    return Response.json({ cards: await getCards(game, set) });
  } catch (err) {
    const error = String(err?.message) === "upstream_error" ? "upstream_error" : "fetch_failed";
    return Response.json({ cards: [], error }, { status: 502 });
  }
}
