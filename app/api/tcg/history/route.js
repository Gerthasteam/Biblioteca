import { sql, ensureSchema } from "../../../../lib/db";
import { requireUser } from "../../../../lib/auth";

// Evolución del valor de la colección TCG: la app manda una vez por día (y
// por juego) cuánto vale lo que tenés con los precios del momento, y acá se
// guarda para dibujar el gráfico. Solo se guarda lo que la app calcula —
// no hay ningún proceso que lo haga solo, así que los días que no entrás
// quedan sin dato (el gráfico usa el último valor conocido).
const VALID_GAME = /^[a-z0-9]{1,30}$/;

export async function GET(req) {
  const { userId, response } = requireUser(req);
  if (response) return response;
  try {
    await ensureSchema();
    const { rows } = await sql`
      SELECT to_char(day, 'YYYY-MM-DD') AS day, game, value::float AS value
      FROM tcg_value_history
      WHERE user_id = ${userId} AND day >= CURRENT_DATE - 365
      ORDER BY day ASC`;
    return Response.json({ history: rows });
  } catch (err) {
    return Response.json(
      { history: [], error: "db_unavailable", message: String(err?.message || err) },
      { status: 503 }
    );
  }
}

export async function POST(req) {
  const { userId, response } = requireUser(req);
  if (response) return response;
  try {
    await ensureSchema();
    const { game, value, day } = await req.json();
    const v = Number(value);
    if (!VALID_GAME.test(game || "") || !Number.isFinite(v) || v < 0 || v > 1e9) {
      return Response.json({ error: "invalid" }, { status: 400 });
    }
    // El día lo manda el navegador (fecha local de Argentina, no la del
    // servidor que está en UTC).
    const d = /^\d{4}-\d{2}-\d{2}$/.test(day || "") ? day : new Date().toISOString().slice(0, 10);
    await sql`
      INSERT INTO tcg_value_history (user_id, day, game, value)
      VALUES (${userId}, ${d}, ${game}, ${v.toFixed(2)})
      ON CONFLICT (user_id, day, game) DO UPDATE SET value = EXCLUDED.value`;
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { error: "db_unavailable", message: String(err?.message || err) },
      { status: 503 }
    );
  }
}
