import { sql, ensureSchema, rowToItem } from "../../../../lib/db";
import { requireUser } from "../../../../lib/auth";
import { cleanMeta } from "../../../../lib/manga";

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
    const category = body.category || "manga";
    const status = body.status || "pendiente";
    const unit = body.unit || null;
    const current = Number.isFinite(body.current) ? body.current : 0;
    const total = body.total === "" || body.total == null ? null : Number(body.total);
    const rating = Number.isFinite(body.rating) ? body.rating : 0;
    const notes = body.notes || "";
    const coverUrl = body.coverUrl || null;
    const description = (body.description || "").slice(0, 280);
    // La estrella de la lista de deseos solo cambia si viene en el pedido —
    // el formulario de edición no la manda y no tiene que borrarla.
    const wish = typeof body.wish === "boolean" ? body.wish : null;
    // Lo mismo con lo que pagaste por la carta: solo cambia si viene
    // "cost" en el pedido (un número, o null para borrarlo).
    const setCost = Object.prototype.hasOwnProperty.call(body, "cost");
    const cost = setCost && Number.isFinite(Number(body.cost)) && body.cost !== null && body.cost !== "" ? Number(body.cost) : null;
    // Los datos extra de manga (tomos, edición, reseña…) se reemplazan solo
    // si vienen en el pedido; el formulario de edición no los manda.
    const meta = cleanMeta(body.meta);

    const { rows } = await sql`
      UPDATE items SET
        title=${title}, category=${category}, status=${status}, unit=${unit},
        current=${current}, total=${total}, rating=${rating}, notes=${notes}, cover_url=${coverUrl},
        description=${description}, wish=COALESCE(${wish}::boolean, wish),
        cost=CASE WHEN ${setCost} THEN ${cost}::numeric ELSE cost END,
        meta=COALESCE(${meta ? JSON.stringify(meta) : null}::jsonb, meta)
      WHERE id=${id} AND user_id=${userId}
      RETURNING *`;
    if (!rows[0]) return Response.json({ error: "not_found" }, { status: 404 });
    return Response.json({ item: rowToItem(rows[0]) });
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
    await sql`DELETE FROM items WHERE id=${id} AND user_id=${userId}`;
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { error: "db_unavailable", message: String(err?.message || err) },
      { status: 503 }
    );
  }
}
