import { randomBytes } from "crypto";
import { sql, ensureSchema } from "../../../lib/db";
import { requireUser } from "../../../lib/auth";

// Link público de solo lectura a tu colección de manga (/c/<token>).
// GET: si está activo y cuál es. POST: lo crea (o devuelve el que ya hay).
// DELETE: lo desactiva — el link viejo deja de funcionar.
export async function GET(req) {
  const { userId, response } = requireUser(req);
  if (response) return response;
  try {
    await ensureSchema();
    const { rows } = await sql`SELECT token FROM share_links WHERE user_id = ${userId}`;
    return Response.json({ token: rows[0]?.token || null });
  } catch (err) {
    return Response.json({ token: null, error: "db_unavailable", message: String(err?.message || err) }, { status: 503 });
  }
}

export async function POST(req) {
  const { userId, response } = requireUser(req);
  if (response) return response;
  try {
    await ensureSchema();
    const token = randomBytes(9).toString("base64url");
    await sql`INSERT INTO share_links (token, user_id) VALUES (${token}, ${userId}) ON CONFLICT (user_id) DO NOTHING`;
    const { rows } = await sql`SELECT token FROM share_links WHERE user_id = ${userId}`;
    return Response.json({ token: rows[0]?.token || null });
  } catch (err) {
    return Response.json({ error: "db_unavailable", message: String(err?.message || err) }, { status: 503 });
  }
}

export async function DELETE(req) {
  const { userId, response } = requireUser(req);
  if (response) return response;
  try {
    await ensureSchema();
    await sql`DELETE FROM share_links WHERE user_id = ${userId}`;
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: "db_unavailable", message: String(err?.message || err) }, { status: 503 });
  }
}
