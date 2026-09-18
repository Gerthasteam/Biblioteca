import { sql, ensureSchema, rowToAnime } from "../../../../lib/db";
import { requireUser } from "../../../../lib/auth";

export async function PATCH(req, { params }) {
  const { userId, response } = requireUser(req);
  if (response) return response;
  try {
    await ensureSchema();
    const id = Number(params.id);
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
      UPDATE animes SET
        title=${title}, status=${status}, current=${current}, total=${total},
        rating=${rating}, notes=${notes}, cover_url=${coverUrl}
      WHERE id=${id} AND user_id=${userId}
      RETURNING *`;
    if (!rows[0]) return Response.json({ error: "not_found" }, { status: 404 });
    return Response.json({ anime: rowToAnime(rows[0]) });
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
    const id = Number(params.id);
    await sql`DELETE FROM animes WHERE id=${id} AND user_id=${userId}`;
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { error: "db_unavailable", message: String(err?.message || err) },
      { status: 503 }
    );
  }
}
