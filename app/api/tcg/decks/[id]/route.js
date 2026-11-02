import { sql, ensureSchema } from "../../../../../lib/db";
import { requireUser } from "../../../../../lib/auth";
import { cleanDeckCards, rowToDeck } from "../../../../../lib/tcgDecks";

// Cambiar el nombre o las cartas de un mazo (solo lo que venga en el pedido).
export async function PATCH(req, { params }) {
  const { userId, response } = requireUser(req);
  if (response) return response;
  try {
    await ensureSchema();
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) || null : null;
    const cards = Array.isArray(body.cards) ? JSON.stringify(cleanDeckCards(body.cards)) : null;
    const { rows } = await sql`
      UPDATE tcg_decks SET
        name = COALESCE(${name}, name),
        cards = COALESCE(${cards}::jsonb, cards),
        updated_at = now()
      WHERE id = ${Number(params.id)} AND user_id = ${userId}
      RETURNING *`;
    if (!rows[0]) return Response.json({ error: "not_found" }, { status: 404 });
    return Response.json({ deck: rowToDeck(rows[0]) });
  } catch (err) {
    return Response.json(
      { error: "db_unavailable", message: String(err?.message || err) },
      { status: 503 }
    );
  }
}

export async function DELETE(req, { params }) {
  const { userId, response } = requireUser(req);
  if (response) return response;
  try {
    await ensureSchema();
    await sql`DELETE FROM tcg_decks WHERE id = ${Number(params.id)} AND user_id = ${userId}`;
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { error: "db_unavailable", message: String(err?.message || err) },
      { status: 503 }
    );
  }
}
