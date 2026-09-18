import { sql, ensureSchema, rowToUser, dbConfigured } from "../../../../lib/db";
import { getUserIdFromRequest } from "../../../../lib/auth";

export async function GET(req) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return Response.json({ user: null });
    if (!dbConfigured) return Response.json({ user: null });
    await ensureSchema();
    const { rows } = await sql`SELECT * FROM users WHERE id = ${userId}`;
    if (!rows[0]) return Response.json({ user: null });
    return Response.json({ user: rowToUser(rows[0]) });
  } catch (err) {
    return Response.json(
      { user: null, error: "db_unavailable", message: String(err?.message || err) },
      { status: 503 }
    );
  }
}
