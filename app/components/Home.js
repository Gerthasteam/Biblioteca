"use client";

import { useMemo } from "react";
import { BookOpen, Tv, Layers, Target } from "lucide-react";
import { PosterCard } from "./CardGrid";
import { posterBackground } from "../../lib/ui";
import { unreadVolumes, todayLocal } from "../../lib/manga";
import { formatUsd } from "../../lib/tcgCard";
import { readingYearStats } from "./MangaViews";

// El último título de cada categoría (por fecha en que lo agregaste) se usa
// como fondo de su tarjeta en "Tus colecciones" — un degradé bien oscuro
// arriba para que el número y el ícono blancos se sigan leyendo con
// cualquier portada.
function latestOf(list) {
  if (!list.length) return null;
  return [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
}

function coverStyle(latest) {
  if (!latest?.coverUrl) return undefined;
  return {
    backgroundImage: `linear-gradient(160deg, rgba(13,10,20,.7), rgba(13,10,20,.9)), url('${latest.coverUrl.replace(/'/g, "%27")}')`,
    backgroundSize: "cover",
    backgroundPosition: "center"
  };
}

export default function Home({ items, animes, onNavigate, onOpen, airing = {}, valueHistory = [], readingGoal = null }) {
  const mangaItems = useMemo(() => items.filter((i) => i.category === "manga"), [items]);

  // Seguí leyendo: series con tomos sin leer, primero las que leíste hace
  // menos; muestra el próximo tomo a leer.
  const continueReading = useMemo(() => {
    return mangaItems
      .map((it) => {
        const unread = unreadVolumes(it).sort((a, b) => a - b);
        const lastRead = Object.values(it.meta?.read || {}).filter(Boolean).sort().pop() || "";
        return { it, next: unread[0], left: unread.length, lastRead };
      })
      .filter((x) => x.next)
      .sort((a, b) => b.lastRead.localeCompare(a.lastRead))
      .slice(0, 8);
  }, [mangaItems]);

  // Esta semana: tomos que salen (o salieron y no tenés) y episodios que se
  // estrenan en los próximos 7 días.
  const thisWeek = useMemo(() => {
    const today = todayLocal();
    const in14 = new Date(Date.now() + 14 * 86400000).toLocaleDateString("en-CA");
    const out = [];
    for (const it of mangaItems) {
      const n = it.meta?.next;
      if (!n?.number || !n.date) continue;
      const owned = (it.meta?.owned || []).includes(n.number);
      if ((n.date >= today && n.date <= in14) || (n.date < today && !owned)) {
        out.push({ kind: "item", rec: it, when: new Date(n.date + "T12:00:00"), label: `Tomo #${n.number}`, released: n.date <= today });
      }
    }
    const in7 = Date.now() + 7 * 86400000;
    for (const a of animes) {
      const air = a.meta?.anilistId ? airing[a.meta.anilistId] : null;
      if (air?.airingAt && air.airingAt * 1000 <= in7 && a.status !== "completo") {
        out.push({ kind: "anime", rec: a, when: new Date(air.airingAt * 1000), label: `Episodio ${air.episode}`, released: false });
      }
    }
    return out.sort((x, y) => x.when - y.when).slice(0, 10);
  }, [mangaItems, animes, airing]);

  // Valor TCG: el último valor guardado de cada juego (del historial).
  const tcgValueNow = useMemo(() => {
    const last = {};
    for (const h of valueHistory) last[h.game] = h.value;
    const vals = Object.values(last);
    return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
  }, [valueHistory]);

  const year = new Date().getFullYear();
  const readThisYear = useMemo(() => readingYearStats(mangaItems, year).thisYear, [mangaItems, year]);
  // En TCG lo que cuenta es la carta que ya tenés (prendida en la carpeta),
  // no las que se exportaron apagadas con el set completo.
  const tcgItems = useMemo(() => items.filter((i) => i.category === "tcg"), [items]);
  const tcgOwned = useMemo(() => tcgItems.filter((i) => i.status === "completo"), [tcgItems]);

  const latestManga = useMemo(() => latestOf(mangaItems), [mangaItems]);
  const latestAnime = useMemo(() => latestOf(animes), [animes]);
  const latestTcg = useMemo(() => latestOf(tcgOwned), [tcgOwned]);

  // Los videojuegos ya no tienen sección — si quedó alguno cargado de antes
  // no lo mostramos acá. Las cartas TCG tampoco: con una expansión
  // exportada entera llenarían la fila de cartas apagadas.
  const recientes = useMemo(() => {
    const tagged = [
      ...items.filter((i) => i.category !== "videojuego" && i.category !== "tcg").map((i) => ({ ...i, kind: "item" })),
      ...animes.map((a) => ({ ...a, kind: "anime" }))
    ];
    return tagged
      .filter((r) => r.createdAt)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8);
  }, [items, animes]);

  return (
    <div>
      <section className="hero">
        <h1>¡Hola!</h1>
        <p>Tu colección de manga, anime y cartas TCG, en un solo lugar.</p>
        <div className="hero__stats">
          <div className="hero__stat">
            <span className="hero__stat-icon"><BookOpen size={18} /></span>
            <div>
              <b>{mangaItems.length}</b>
              <span>Mangas</span>
            </div>
          </div>
          <div className="hero__stat">
            <span className="hero__stat-icon"><Tv size={18} /></span>
            <div>
              <b>{animes.length}</b>
              <span>Animes</span>
            </div>
          </div>
          <div className="hero__stat">
            <span className="hero__stat-icon"><Layers size={18} /></span>
            <div>
              <b>{tcgOwned.length}</b>
              <span>Cartas{tcgValueNow ? ` · ${formatUsd(tcgValueNow)}` : ""}</span>
            </div>
          </div>
          {(readingGoal || readThisYear > 0) && (
            <div className="hero__stat">
              <span className="hero__stat-icon"><Target size={18} /></span>
              <div>
                <b>
                  {readThisYear}
                  {readingGoal ? `/${readingGoal}` : ""}
                </b>
                <span>Tomos leídos en {year}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {continueReading.length > 0 && (
        <section className="home-section">
          <div className="home-section__head">
            <h2>Seguí leyendo</h2>
            <button type="button" onClick={() => onNavigate("manga")}>Ver pila de lectura</button>
          </div>
          <div className="rail">
            {continueReading.map(({ it, next, left }) => (
              <button key={it.id} type="button" className="poster-card" onClick={() => onOpen("item", it.id)} title={it.title}>
                <div className="poster-card__img" style={{ backgroundImage: posterBackground(it) }}>
                  <span className="home-next">#{next}</span>
                </div>
                <div className="poster-card__title">{it.title}</div>
                <div className="poster-card__meta">
                  {left} sin leer
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {thisWeek.length > 0 && (
        <section className="home-section">
          <div className="home-section__head">
            <h2>Esta semana</h2>
          </div>
          <div className="home-week">
            {thisWeek.map((x) => (
              <button key={x.kind + x.rec.id} type="button" className="home-week__row" onClick={() => onOpen(x.kind, x.rec.id)}>
                <span className="manga-row__thumb" style={{ backgroundImage: x.rec.coverUrl ? `url('${x.rec.coverUrl.replace(/'/g, "%27")}')` : undefined }} />
                <span className="home-week__info">
                  <b>{x.rec.title}</b>
                  <small>
                    {x.kind === "anime" ? <Tv size={11} /> : <BookOpen size={11} />} {x.label} ·{" "}
                    {x.released && x.kind === "item"
                      ? "ya salió y no lo tenés"
                      : x.when.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "short" }).replace(".", "")}
                    {x.kind === "anime" ? ` · ${x.when.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} h` : ""}
                  </small>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {recientes.length > 0 && (
        <section className="home-section">
          <div className="home-section__head">
            <h2>Últimos agregados</h2>
          </div>
          <div className="rail">
            {recientes.map((r) => (
              <PosterCard
                key={r.kind + r.id}
                record={r}
                kind={r.kind}
                onOpen={() => onOpen(r.kind, r.id)}
              />
            ))}
          </div>
        </section>
      )}

      <section className="home-section">
        <div className="home-section__head">
          <h2>Tus colecciones</h2>
        </div>
        <div className="quick-cards">
          <button
            type="button"
            className="quick-card quick-card--manga"
            style={coverStyle(latestManga)}
            onClick={() => onNavigate("manga")}
          >
            <BookOpen size={22} />
            <div>
              <b>{mangaItems.length}</b>
              <span>Manga</span>
            </div>
          </button>
          <button
            type="button"
            className="quick-card quick-card--anime"
            style={coverStyle(latestAnime)}
            onClick={() => onNavigate("anime")}
          >
            <Tv size={22} />
            <div>
              <b>{animes.length}</b>
              <span>Anime</span>
            </div>
          </button>
          <button
            type="button"
            className="quick-card quick-card--tcg"
            style={coverStyle(latestTcg)}
            onClick={() => onNavigate("tcg")}
          >
            <Layers size={22} />
            <div>
              <b>{tcgOwned.length}</b>
              <span>Cartas TCG</span>
            </div>
          </button>
        </div>
      </section>
    </div>
  );
}
