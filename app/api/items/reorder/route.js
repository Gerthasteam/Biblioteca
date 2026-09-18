import { sql, ensureSchema } from "../../../../lib/db";
import { requireUser } from "../../../../lib/auth";

// Recibe la lista de ids en el nuevo orden (siempre dentro de una misma
// categoría — Manga con Manga, TCG con TCG, etc.) y reescribe sort_order
// como su posición en esa lista.
export async function PATCH(req) {
  const { userId, response } = requireUser(req);
  if (response) return response;
  try {
    await ensureSchema();
    const body = await req.json();
    const ids = Array.isArray(body.ids) ? body.ids.map(Number).filter(Number.isFinite) : [];
    if (!ids.length) {
      return Response.json({ error: "invalid", message: "Falta la lista de ids" }, { status: 400 });
    }
    await Promise.all(
      ids.map((id, index) => sql`UPDATE items SET sort_order = ${index} WHERE id = ${id} AND user_id = ${userId}`)
    );
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { error: "db_unavailable", message: String(err?.message || err) },
      { status: 503 }
    );
  }
}
