import { sql, ensureSchema, rowToItem } from "../../../lib/db";
import { requireUser } from "../../../lib/auth";

export async function GET(req) {
  const { userId, response } = requireUser(req);
  if (response) return response;
  try {
    await ensureSchema();
    const { rows } = await sql`
      SELECT * FROM items WHERE user_id = ${userId} ORDER BY sort_order ASC, created_at ASC`;
    return Response.json({ items: rows.map(rowToItem) });
  } catch (err) {
    return Response.json(
      { error: "db_unavailable", message: String(err?.message || err) },
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
    const title = (body.title || "").trim();
    if (!title) {
      return Response.json({ error: "invalid", message: "Falta el título" }, { status: 400 });
    }
    const category = body.category || "manga";
    const status = body.status || "pendiente";
    const unit = body.unit || null;
    const current = Number.isFinite(body.current) ? body.current : 0;
    const total = body.total === "" || body.total == null ? null : Number(body.total);
    const rating = Number.isFinite(body.rating) ? body.rating : 0;
    const notes = body.notes || "";
    const coverUrl = body.coverUrl || null;
    const description = (body.description || "").slice(0, 280);

    const { rows } = await sql`
      INSERT INTO items (title, category, status, unit, current, total, rating, notes, cover_url, description, sort_order, user_id)
      VALUES (
        ${title}, ${category}, ${status}, ${unit}, ${current}, ${total}, ${rating}, ${notes}, ${coverUrl}, ${description},
        COALESCE((SELECT MAX(sort_order) + 1 FROM items WHERE category = ${category} AND user_id = ${userId}), 0),
        ${userId}
      )
      RETURNING *`;
    return Response.json({ item: rowToItem(rows[0]) }, { status: 201 });
  } catch (err) {
    return Response.json(
      { error: "db_unavailable", message: String(err?.message || err) },
      { status: 503 }
    );
  }
}
