import { sql, ensureSchema } from "../../../../lib/db";
import { requireUser } from "../../../../lib/auth";
import { cleanDeckCards, rowToDeck } from "../../../../lib/tcgDecks";

// Mazos TCG del usuario. Cada mazo guarda sus cartas por número
// ([{ number: "OP01-016", qty: 4 }]); el nombre, la imagen y el precio
// salen de la API al mostrarlo.
const VALID_GAME = /^[a-z0-9]{1,30}$/;

export async function GET(req) {
  const { userId, response } = requireUser(req);
  if (response) return response;
  try {
    await ensureSchema();
    const { rows } = await sql`SELECT * FROM tcg_decks WHERE user_id = ${userId} ORDER BY updated_at DESC`;
    return Response.json({ decks: rows.map(rowToDeck) });
  } catch (err) {
    return Response.json(
      { decks: [], error: "db_unavailable", message: String(err?.message || err) },
      { status: 503 }
    );
  }
}

export async function POST(req) {
  const { userId, response } = requireUser(req);
  if (response) return response;
  try {
    await ensureSchema();
    const body = await req.json();
    const name = String(body.name || "").trim().slice(0, 80);
    if (!VALID_GAME.test(body.game || "") || !name) {
      return Response.json({ error: "invalid", message: "Falta el nombre del mazo." }, { status: 400 });
    }
    const cards = cleanDeckCards(body.cards);
    const { rows } = await sql`
      INSERT INTO tcg_decks (user_id, game, name, cards)
      VALUES (${userId}, ${body.game}, ${name}, ${JSON.stringify(cards)}::jsonb)
      RETURNING *`;
    return Response.json({ deck: rowToDeck(rows[0]) }, { status: 201 });
  } catch (err) {
    return Response.json(
      { error: "db_unavailable", message: String(err?.message || err) },
      { status: 503 }
    );
  }
}
