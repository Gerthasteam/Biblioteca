import { sql, ensureSchema, rowToItem } from "../../../../lib/db";
import { requireUser } from "../../../../lib/auth";

// Borra muchos items de una — usado para borrar una carpeta TCG entera
// (todas las cartas de una expansión) de un solo click.
export async function DELETE(req) {
  const { userId, response } = requireUser(req);
  if (response) return response;
  try {
    await ensureSchema();
    const body = await req.json();
    const ids = Array.isArray(body.ids) ? body.ids.map(Number).filter(Number.isFinite).slice(0, 400) : [];
    if (!ids.length) return Response.json({ ok: true, deleted: 0 });
    await Promise.all(ids.map((id) => sql`DELETE FROM items WHERE id = ${id} AND user_id = ${userId}`));
    return Response.json({ ok: true, deleted: ids.length });
  } catch (err) {
    return Response.json(
      { error: "db_unavailable", message: String(err?.message || err) },
      { status: 503 }
    );
  }
}

// Inserta muchas cartas de una — usado por "Carpeta TCG" para exportar una
// expansión entera (o todas las de un juego, en tandas) de una sola vez,
// respetando el orden oficial de las cartas (sort_order = posición dentro
// de la tanda, a partir del máximo actual de esa categoría). Va en un solo
// INSERT con unnest(): antes era un INSERT por carta, que con miles de
// cartas tardaba demasiado.
export async function POST(req) {
  const { userId, response } = requireUser(req);
  if (response) return response;
  try {
    await ensureSchema();
    const body = await req.json();
    const list = Array.isArray(body.items) ? body.items.slice(0, 1000) : [];
    if (!list.length) return Response.json({ items: [] });

    const category = list[0].category || "tcg";
    const { rows: baseRows } = await sql`
      SELECT COALESCE(MAX(sort_order) + 1, 0) AS next FROM items WHERE category = ${category} AND user_id = ${userId}`;
    const base = baseRows[0].next;

    const titles = [];
    const categories = [];
    const statuses = [];
    const units = [];
    const currents = [];
    const totals = [];
    const ratings = [];
    const notes = [];
    const covers = [];
    const orders = [];
    list.forEach((it, i) => {
      titles.push((it.title || "").trim().slice(0, 200) || "Sin título");
      categories.push(it.category || category);
      statuses.push(it.status || "pendiente");
      units.push(it.unit || null);
      currents.push(Number.isFinite(it.current) ? it.current : 0);
      totals.push(it.total === "" || it.total == null ? null : Number(it.total));
      ratings.push(Number.isFinite(it.rating) ? it.rating : 0);
      notes.push(it.notes || "");
      covers.push(it.coverUrl || null);
      orders.push(base + i);
    });

    const { rows } = await sql`
      INSERT INTO items (title, category, status, unit, current, total, rating, notes, cover_url, sort_order, user_id)
      SELECT t.title, t.category, t.status, t.unit, t.current, t.total, t.rating, t.notes, t.cover_url, t.sort_order, ${userId}
      FROM unnest(
        ${titles}::text[], ${categories}::text[], ${statuses}::text[], ${units}::text[], ${currents}::int[],
        ${totals}::int[], ${ratings}::int[], ${notes}::text[], ${covers}::text[], ${orders}::int[]
      ) AS t(title, category, status, unit, current, total, rating, notes, cover_url, sort_order)
      RETURNING *`;
    const inserted = rows.map(rowToItem).sort((a, b) => a.sortOrder - b.sortOrder);
    return Response.json({ items: inserted }, { status: 201 });
  } catch (err) {
    return Response.json(
      { error: "db_unavailable", message: String(err?.message || err) },
      { status: 503 }
    );
  }
}
