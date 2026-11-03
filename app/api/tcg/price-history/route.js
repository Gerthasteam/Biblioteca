import { sql, ensureSchema } from "../../../../lib/db";
import { requireUser } from "../../../../lib/auth";

// Historial de precio por carta.
// GET  ?game=onepiece&key=OP01-016 → { history: [{ day, price }] } (último año)
// POST { game, day, prices: { key: precio } } → guarda el precio de hoy de las
//      cartas que tenés (si ya estaba el de hoy, no lo pisa).
const VALID_GAME = /^[a-z0-9]{1,30}$/;

export async function GET(req) {
  const { response } = requireUser(req);
  if (response) return response;
  const { searchParams } = new URL(req.url);
  const game = searchParams.get("game") || "";
  const key = (searchParams.get("key") || "").slice(0, 60);
  if (!VALID_GAME.test(game) || !key) return Response.json({ history: [] });
  try {
    await ensureSchema();
    const { rows } = await sql`
      SELECT to_char(day, 'YYYY-MM-DD') AS day, price::float AS price FROM tcg_price_history
      WHERE game = ${game} AND card_key = ${key} AND day >= CURRENT_DATE - 365
      ORDER BY day ASC`;
    return Response.json({ history: rows });
  } catch (err) {
    return Response.json({ history: [], error: "db_unavailable", message: String(err?.message || err) }, { status: 503 });
  }
}

export async function POST(req) {
  const { response } = requireUser(req);
  if (response) return response;
  try {
    await ensureSchema();
    const { game, day, prices } = await req.json();
    if (!VALID_GAME.test(game || "") || !prices || typeof prices !== "object") return Response.json({ ok: false }, { status: 400 });
    const d = /^\d{4}-\d{2}-\d{2}$/.test(day || "") ? day : new Date().toISOString().slice(0, 10);
    const entries = Object.entries(prices)
      .filter(([k, p]) => k && k.length <= 60 && Number.isFinite(Number(p)) && Number(p) >= 0)
      .slice(0, 4000);
    if (!entries.length) return Response.json({ ok: true, saved: 0 });
    await sql`
      INSERT INTO tcg_price_history (game, card_key, day, price)
      SELECT ${game}, t.k, ${d}::date, t.p FROM unnest(${entries.map((e) => e[0])}::text[], ${entries.map((e) => Number(e[1]))}::numeric[]) AS t(k, p)
      ON CONFLICT DO NOTHING`;
    return Response.json({ ok: true, saved: entries.length });
  } catch (err) {
    return Response.json({ error: "db_unavailable", message: String(err?.message || err) }, { status: 503 });
  }
}
