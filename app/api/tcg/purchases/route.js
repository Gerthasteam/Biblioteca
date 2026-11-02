import { sql, ensureSchema } from "../../../../lib/db";
import { requireUser } from "../../../../lib/auth";

// Compras de producto sellado (sobres, cajas…) para la ganancia/pérdida de
// la colección TCG. Montos en dólares.
const VALID_GAME = /^[a-z0-9]{1,30}$/;

function rowToPurchase(r) {
  return { id: String(r.id), game: r.game, description: r.description, amount: Number(r.amount), day: r.day };
}

export async function GET(req) {
  const { userId, response } = requireUser(req);
  if (response) return response;
  try {
    await ensureSchema();
    const { rows } = await sql`
      SELECT id, game, description, amount, to_char(day, 'YYYY-MM-DD') AS day
      FROM tcg_purchases WHERE user_id = ${userId} ORDER BY day DESC, id DESC`;
    return Response.json({ purchases: rows.map(rowToPurchase) });
  } catch (err) {
    return Response.json(
      { purchases: [], error: "db_unavailable", message: String(err?.message || err) },
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
    const description = String(body.description || "").trim().slice(0, 120);
    const amount = Number(body.amount);
    const day = /^\d{4}-\d{2}-\d{2}$/.test(body.day || "") ? body.day : new Date().toISOString().slice(0, 10);
    if (!VALID_GAME.test(body.game || "") || !description || !Number.isFinite(amount) || amount < 0 || amount > 1e8) {
      return Response.json({ error: "invalid", message: "Completá qué compraste y cuánto pagaste." }, { status: 400 });
    }
    const { rows } = await sql`
      INSERT INTO tcg_purchases (user_id, game, description, amount, day)
      VALUES (${userId}, ${body.game}, ${description}, ${amount.toFixed(4)}, ${day})
      RETURNING id, game, description, amount, to_char(day, 'YYYY-MM-DD') AS day`;
    return Response.json({ purchase: rowToPurchase(rows[0]) }, { status: 201 });
  } catch (err) {
    return Response.json(
      { error: "db_unavailable", message: String(err?.message || err) },
      { status: 503 }
    );
  }
}

export async function DELETE(req) {
  const { userId, response } = requireUser(req);
  if (response) return response;
  try {
    await ensureSchema();
    const { id } = await req.json();
    await sql`DELETE FROM tcg_purchases WHERE id = ${Number(id)} AND user_id = ${userId}`;
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { error: "db_unavailable", message: String(err?.message || err) },
      { status: 503 }
    );
  }
}
