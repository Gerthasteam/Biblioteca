import { sql, ensureSchema } from "../../../lib/db";
import { requireUser } from "../../../lib/auth";

// Backup de toda la colección del usuario en un solo JSON.
// GET  → descarga (manga, anime, TCG, carpetas, juegos, compras, mazos,
//        historial de valor).
// POST → restaura un backup REEMPLAZANDO todo lo actual (la app pide
//        confirmación antes). Las cartas se insertan en tandas con unnest().
const VERSION = 1;

export async function GET(req) {
  const { userId, response } = requireUser(req);
  if (response) return response;
  try {
    await ensureSchema();
    const [items, animes, folders, games, purchases, decks, history] = await Promise.all([
      sql`SELECT title, category, status, unit, current, total, rating, notes, cover_url, sort_order, description, wish, cost, meta, created_at FROM items WHERE user_id = ${userId} ORDER BY sort_order, id`,
      sql`SELECT title, status, current, total, rating, notes, cover_url, meta, created_at FROM animes WHERE user_id = ${userId} ORDER BY id`,
      sql`SELECT id, name, game, created_at FROM tcg_folders WHERE user_id = ${userId}`,
      sql`SELECT game, created_at FROM tcg_games WHERE user_id = ${userId}`,
      sql`SELECT game, description, amount, to_char(day, 'YYYY-MM-DD') AS day FROM tcg_purchases WHERE user_id = ${userId}`,
      sql`SELECT game, name, cards, created_at FROM tcg_decks WHERE user_id = ${userId}`,
      sql`SELECT to_char(day, 'YYYY-MM-DD') AS day, game, value FROM tcg_value_history WHERE user_id = ${userId}`
    ]);
    const body = {
      app: "mi-estante",
      version: VERSION,
      exportedAt: new Date().toISOString(),
      items: items.rows,
      animes: animes.rows,
      tcgFolders: folders.rows,
      tcgGames: games.rows,
      purchases: purchases.rows,
      decks: decks.rows,
      valueHistory: history.rows
    };
    const day = new Date().toISOString().slice(0, 10);
    return new Response(JSON.stringify(body), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="mi-estante-backup-${day}.json"`
      }
    });
  } catch (err) {
    return Response.json({ error: "db_unavailable", message: String(err?.message || err) }, { status: 503 });
  }
}

const arr = (v) => (Array.isArray(v) ? v : []);
const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const intOrNull = (v) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Math.round(Number(v)));

export async function POST(req) {
  const { userId, response } = requireUser(req);
  if (response) return response;
  try {
    await ensureSchema();
    const b = await req.json();
    if (!b || b.app !== "mi-estante" || !Array.isArray(b.items)) {
      return Response.json({ error: "invalid", message: "Ese archivo no es un backup de Mi Estante." }, { status: 400 });
    }

    // 1) borrar lo actual del usuario
    await sql`DELETE FROM items WHERE user_id = ${userId}`;
    await sql`DELETE FROM animes WHERE user_id = ${userId}`;
    await sql`DELETE FROM tcg_folders WHERE user_id = ${userId}`;
    await sql`DELETE FROM tcg_games WHERE user_id = ${userId}`;
    await sql`DELETE FROM tcg_purchases WHERE user_id = ${userId}`;
    await sql`DELETE FROM tcg_decks WHERE user_id = ${userId}`;
    await sql`DELETE FROM tcg_value_history WHERE user_id = ${userId}`;

    // 2) items en tandas de 800
    const items = arr(b.items).slice(0, 20000);
    for (let i = 0; i < items.length; i += 800) {
      const chunk = items.slice(i, i + 800);
      const col = (fn) => chunk.map(fn);
      await sql`
        INSERT INTO items (title, category, status, unit, current, total, rating, notes, cover_url, sort_order, description, wish, cost, meta, user_id)
        SELECT t.title, t.category, t.status, t.unit, t.current, t.total, t.rating, t.notes, t.cover_url, t.sort_order, t.description, t.wish, t.cost, t.meta::jsonb, ${userId}
        FROM unnest(
          ${col((it) => String(it.title || "Sin título").slice(0, 200))}::text[],
          ${col((it) => String(it.category || "manga"))}::text[],
          ${col((it) => String(it.status || "pendiente"))}::text[],
          ${col((it) => it.unit || null)}::text[],
          ${col((it) => Math.round(num(it.current)))}::int[],
          ${col((it) => intOrNull(it.total))}::int[],
          ${col((it) => Math.round(num(it.rating)))}::int[],
          ${col((it) => String(it.notes || ""))}::text[],
          ${col((it) => it.cover_url || null)}::text[],
          ${col((it) => Math.round(num(it.sort_order)))}::int[],
          ${col((it) => String(it.description || "").slice(0, 280))}::text[],
          ${col((it) => !!it.wish)}::boolean[],
          ${col((it) => (it.cost == null ? null : num(it.cost)))}::numeric[],
          ${col((it) => JSON.stringify(it.meta && typeof it.meta === "object" ? it.meta : {}))}::text[]
        ) AS t(title, category, status, unit, current, total, rating, notes, cover_url, sort_order, description, wish, cost, meta)`;
    }

    // 3) el resto (son pocas filas)
    for (const a of arr(b.animes).slice(0, 5000)) {
      await sql`
        INSERT INTO animes (title, status, current, total, rating, notes, cover_url, meta, user_id)
        VALUES (${String(a.title || "Sin título")}, ${a.status || "pendiente"}, ${Math.round(num(a.current))}, ${intOrNull(a.total)},
          ${Math.round(num(a.rating))}, ${String(a.notes || "")}, ${a.cover_url || null}, ${JSON.stringify(a.meta || {})}::jsonb, ${userId})`;
    }
    for (const f of arr(b.tcgFolders)) {
      await sql`INSERT INTO tcg_folders (id, name, game, user_id) VALUES (${String(f.id)}, ${String(f.name || "Carpeta")}, ${f.game || null}, ${userId})
        ON CONFLICT (id) DO NOTHING`;
    }
    for (const g of arr(b.tcgGames)) {
      await sql`INSERT INTO tcg_games (user_id, game) VALUES (${userId}, ${String(g.game)}) ON CONFLICT DO NOTHING`;
    }
    for (const p of arr(b.purchases)) {
      await sql`INSERT INTO tcg_purchases (user_id, game, description, amount, day)
        VALUES (${userId}, ${String(p.game)}, ${String(p.description || "Compra")}, ${num(p.amount)}, ${p.day || new Date().toISOString().slice(0, 10)})`;
    }
    for (const d of arr(b.decks)) {
      await sql`INSERT INTO tcg_decks (user_id, game, name, cards) VALUES (${userId}, ${String(d.game)}, ${String(d.name || "Mazo")}, ${JSON.stringify(d.cards || [])}::jsonb)`;
    }
    for (const h of arr(b.valueHistory)) {
      await sql`INSERT INTO tcg_value_history (user_id, day, game, value) VALUES (${userId}, ${h.day}, ${String(h.game)}, ${num(h.value)})
        ON CONFLICT DO NOTHING`;
    }
    return Response.json({ ok: true, items: items.length, animes: arr(b.animes).length });
  } catch (err) {
    return Response.json({ error: "db_unavailable", message: String(err?.message || err) }, { status: 503 });
  }
}
