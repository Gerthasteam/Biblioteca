import { sql, ensureSchema, rowToTcgFolder } from "../../../../lib/db";

// Carpetas TCG armadas a mano por el usuario (botón "Nueva carpeta"), a
// diferencia de las que salen de exportar una expansión real.
export async function GET() {
  try {
    await ensureSchema();
    const { rows } = await sql`SELECT * FROM tcg_folders ORDER BY created_at ASC`;
    return Response.json({ folders: rows.map(rowToTcgFolder) });
  } catch (err) {
    return Response.json(
      { folders: [], error: "db_unavailable", message: String(err?.message || err) },
      { status: 503 }
    );
  }
}

export async function POST(req) {
  try {
    await ensureSchema();
    const body = await req.json();
    const name = (body.name || "").trim();
    if (!name) {
      return Response.json({ error: "invalid", message: "Falta el nombre" }, { status: 400 });
    }
    const id = "f" + Math.random().toString(36).slice(2, 10);
    const { rows } = await sql`INSERT INTO tcg_folders (id, name) VALUES (${id}, ${name}) RETURNING *`;
    return Response.json({ folder: rowToTcgFolder(rows[0]) });
  } catch (err) {
    return Response.json(
      { error: "db_unavailable", message: String(err?.message || err) },
      { status: 503 }
    );
  }
}
