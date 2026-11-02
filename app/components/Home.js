"use client";

import { useMemo } from "react";
import { BookOpen, Tv, Layers } from "lucide-react";
import { PosterCard } from "./CardGrid";

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

export default function Home({ items, animes, onNavigate, onOpen }) {
  const mangaItems = useMemo(() => items.filter((i) => i.category === "manga"), [items]);
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
              <span>Cartas</span>
            </div>
          </div>
        </div>
      </section>

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
