import { sql, ensureSchema, rowToTcgFolder } from "../../../../../lib/db";

export async function PATCH(req, { params }) {
  try {
    await ensureSchema();
    const body = await req.json();
    const name = (body.name || "").trim();
    if (!name) {
      return Response.json({ error: "invalid", message: "Falta el nombre" }, { status: 400 });
    }
    const { rows } = await sql`UPDATE tcg_folders SET name=${name} WHERE id=${params.id} RETURNING *`;
    if (!rows[0]) return Response.json({ error: "not_found" }, { status: 404 });
    return Response.json({ folder: rowToTcgFolder(rows[0]) });
  } catch (err) {
    return Response.json(
      { error: "db_unavailable", message: String(err?.message || err) },
      { status: 503 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    await ensureSchema();
    await sql`DELETE FROM tcg_folders WHERE id=${params.id}`;
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { error: "db_unavailable", message: String(err?.message || err) },
      { status: 503 }
    );
  }
}
