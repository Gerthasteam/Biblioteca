import { sql, ensureSchema } from "../../../../lib/db";
import { requireUser } from "../../../../lib/auth";

// Juegos TCG que el usuario sumó a su sección (la grilla de logos). Solo
// guardamos la clave del juego (ver lib/tcgGames.js); el nombre y el logo
// salen del catálogo.
const VALID = /^[a-z0-9]{1,30}$/;

export async function GET(req) {
  const { userId, response } = requireUser(req);
  if (response) return response;
  try {
    await ensureSchema();
    const { rows } = await sql`SELECT game FROM tcg_games WHERE user_id = ${userId} ORDER BY created_at ASC`;
    return Response.json({ games: rows.map((r) => r.game) });
  } catch (err) {
    return Response.json(
      { games: [], error: "db_unavailable", message: String(err?.message || err) },
      { status: 503 }
    );
  }
}

export async function POST(req) {
  const { userId, response } = requireUser(req);
  if (response) return response;
  try {
    await ensureSchema();
    const { game } = await req.json();
    if (!VALID.test(game || "")) {
      return Response.json({ error: "invalid", message: "Juego inválido" }, { status: 400 });
    }
    await sql`INSERT INTO tcg_games (user_id, game) VALUES (${userId}, ${game}) ON CONFLICT DO NOTHING`;
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { error: "db_unavailable", message: String(err?.message || err) },
      { status: 503 }
    );
  }
}

// Saca el juego de la grilla. Las carpetas y cartas se borran aparte (desde
// la app, antes de llamar acá) — esta ruta no toca items.
export async function DELETE(req) {
  const { userId, response } = requireUser(req);
  if (response) return response;
  try {
    await ensureSchema();
    const { game } = await req.json();
    await sql`DELETE FROM tcg_games WHERE user_id = ${userId} AND game = ${game || ""}`;
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { error: "db_unavailable", message: String(err?.message || err) },
      { status: 503 }
    );
  }
}
