import { sql, ensureSchema, rowToItem, dbConfigured } from "../../../lib/db";
import { missingVolumes, unreadVolumes, SERIES_STATUS_LABEL } from "../../../lib/manga";
import { stars } from "../../../lib/ui";

// Colección pública de manga (solo lectura), a la que se llega con el link
// que genera "Compartir colección". No muestra el mail ni nada de la cuenta:
// solo las series, sus tomos, el puntaje y la reseña.
export const dynamic = "force-dynamic";

export const metadata = { title: "Colección de manga · Mi Estante", robots: { index: false } };

async function load(token) {
  if (!dbConfigured || !/^[A-Za-z0-9_-]{6,40}$/.test(token || "")) return null;
  await ensureSchema();
  const { rows: link } = await sql`SELECT user_id FROM share_links WHERE token = ${token}`;
  if (!link[0]) return null;
  const { rows } = await sql`
    SELECT * FROM items WHERE user_id = ${link[0].user_id} AND category = 'manga' ORDER BY sort_order ASC, created_at ASC`;
  return rows.map(rowToItem);
}

export default async function SharedCollection({ params }) {
  const items = await load(params.token);
  if (!items) {
    return (
      <main className="share-page">
        <div className="empty-note">Este link no existe o fue desactivado.</div>
      </main>
    );
  }
  const totalVols = items.reduce((n, it) => n + (it.meta?.owned || []).length, 0);
  const totalRead = items.reduce((n, it) => n + Object.keys(it.meta?.read || {}).length, 0);
  return (
    <main className="share-page">
      <header className="share-page__head">
        <img src="/mascot-icon.png" alt="" />
        <div>
          <h1>Colección de manga</h1>
          <p className="section-header__sub">
            {items.length} series · {totalVols} tomos · {totalRead} leídos — compartido desde Mi Estante
          </p>
        </div>
      </header>
      {items.length === 0 ? (
        <div className="empty-note">Todavía no hay series en esta colección.</div>
      ) : (
        <div className="share-grid">
          {items.map((it) => {
            const m = it.meta || {};
            const owned = (m.owned || []).length;
            const missing = missingVolumes(it).length;
            return (
              <article key={it.id} className="share-card">
                <div className="share-card__cover" style={{ backgroundImage: it.coverUrl ? `url('${it.coverUrl.replace(/'/g, "%27")}')` : undefined }} />
                <div className="share-card__body">
                  <h2>{it.title}</h2>
                  <small>
                    {[m.publisher, SERIES_STATUS_LABEL[m.seriesStatus]].filter(Boolean).join(" · ")}
                  </small>
                  {(owned > 0 || m.published) && (
                    <small>
                      {owned}
                      {m.published ? `/${m.published}` : ""} tomos
                      {missing ? ` · le faltan ${missing}` : ""}
                      {unreadVolumes(it).length ? ` · ${unreadVolumes(it).length} sin leer` : ""}
                    </small>
                  )}
                  {it.rating > 0 && <span className="stars-line">{stars(it.rating)}</span>}
                  {m.review && <p>{m.review}</p>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
