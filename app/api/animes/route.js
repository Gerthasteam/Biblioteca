import { sql, ensureSchema, rowToAnime } from "../../../lib/db";
import { requireUser } from "../../../lib/auth";

export async function GET(req) {
  const { userId, response } = requireUser(req);
  if (response) return response;
  try {
    await ensureSchema();
    const { rows } = await sql`SELECT * FROM animes WHERE user_id = ${userId} ORDER BY created_at ASC`;
    return Response.json({ animes: rows.map(rowToAnime) });
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
    const status = body.status || "pendiente";
    const current = Number.isFinite(body.current) ? body.current : 0;
    const total = body.total === "" || body.total == null ? null : Number(body.total);
    const rating = Number.isFinite(body.rating) ? body.rating : 0;
    const notes = body.notes || "";
    const coverUrl = body.coverUrl || null;

    const { rows } = await sql`
      INSERT INTO animes (title, status, current, total, rating, notes, cover_url, user_id)
      VALUES (${title}, ${status}, ${current}, ${total}, ${rating}, ${notes}, ${coverUrl}, ${userId})
      RETURNING *`;
    return Response.json({ anime: rowToAnime(rows[0]) }, { status: 201 });
  } catch (err) {
    return Response.json(
      { error: "db_unavailable", message: String(err?.message || err) },
      { status: 503 }
    );
  }
}
