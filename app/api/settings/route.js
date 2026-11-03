import { sql, ensureSchema } from "../../../lib/db";
import { requireUser } from "../../../lib/auth";

// Ajustes del usuario que viajan entre dispositivos. Por ahora:
// { readingGoals: { "2026": 100 } } — la meta del desafío de lectura de cada año.
function clean(d) {
  const goals = {};
  for (const [y, n] of Object.entries(d?.readingGoals || {})) {
    const v = parseInt(n, 10);
    if (/^\d{4}$/.test(y) && Number.isFinite(v) && v > 0 && v <= 5000) goals[y] = v;
  }
  return { readingGoals: goals };
}

export async function GET(req) {
  const { userId, response } = requireUser(req);
  if (response) return response;
  try {
    await ensureSchema();
    const { rows } = await sql`SELECT data FROM user_settings WHERE user_id = ${userId}`;
    return Response.json({ settings: clean(rows[0]?.data || {}) });
  } catch (err) {
    return Response.json({ settings: clean({}), error: "db_unavailable", message: String(err?.message || err) }, { status: 503 });
  }
}

export async function PATCH(req) {
  const { userId, response } = requireUser(req);
  if (response) return response;
  try {
    await ensureSchema();
    const data = clean(await req.json());
    await sql`
      INSERT INTO user_settings (user_id, data) VALUES (${userId}, ${JSON.stringify(data)}::jsonb)
      ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data`;
    return Response.json({ settings: data });
  } catch (err) {
    return Response.json({ error: "db_unavailable", message: String(err?.message || err) }, { status: 503 });
  }
}
