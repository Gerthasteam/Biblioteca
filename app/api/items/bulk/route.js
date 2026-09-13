import { sql, ensureSchema, rowToItem } from "../../../../lib/db";

// Borra muchos items de una — usado para borrar una carpeta TCG entera
// (todas las cartas de una expansión) de un solo click.
export async function DELETE(req) {
  try {
    await ensureSchema();
    const body = await req.json();
    const ids = Array.isArray(body.ids) ? body.ids.map(Number).filter(Number.isFinite).slice(0, 400) : [];
    if (!ids.length) return Response.json({ ok: true, deleted: 0 });
    await Promise.all(ids.map((id) => sql`DELETE FROM items WHERE id = ${id}`));
    return Response.json({ ok: true, deleted: ids.length });
  } catch (err) {
    return Response.json(
      { error: "db_unavailable", message: String(err?.message || err) },
      { status: 503 }
    );
  }
}

// Inserta muchas cartas de una — usado por "Carpeta TCG" para exportar una
// expansión entera de una sola vez, respetando el orden oficial de las
// cartas (sort_order = posición dentro de la tanda, a partir del máximo
// actual de esa categoría).
export async function POST(req) {
  try {
    await ensureSchema();
    const body = await req.json();
    const list = Array.isArray(body.items) ? body.items.slice(0, 400) : [];
    if (!list.length) return Response.json({ items: [] });

    const category = list[0].category || "tcg";
    const { rows: baseRows } = await sql`
      SELECT COALESCE(MAX(sort_order) + 1, 0) AS next FROM items WHERE category = ${category}`;
    const base = baseRows[0].next;

    const inserted = await Promise.all(
      list.map(async (it, i) => {
        const title = (it.title || "").trim() || "Sin título";
        const status = it.status || "pendiente";
        const unit = it.unit || null;
        const current = Number.isFinite(it.current) ? it.current : 0;
        const total = it.total === "" || it.total == null ? null : Number(it.total);
        const rating = Number.isFinite(it.rating) ? it.rating : 0;
        const notes = it.notes || "";
        const coverUrl = it.coverUrl || null;
        const { rows } = await sql`
          INSERT INTO items (title, category, status, unit, current, total, rating, notes, cover_url, sort_order)
          VALUES (${title}, ${it.category || category}, ${status}, ${unit}, ${current}, ${total}, ${rating}, ${notes}, ${coverUrl}, ${base + i})
          RETURNING *`;
        return rowToItem(rows[0]);
      })
    );
    return Response.json({ items: inserted }, { status: 201 });
  } catch (err) {
    return Response.json(
      { error: "db_unavailable", message: String(err?.message || err) },
      { status: 503 }
    );
  }
}
