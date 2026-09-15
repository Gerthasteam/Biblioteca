"use client";

import { useMemo } from "react";
import { BookOpen, Tv, Gamepad2, Library, Image as ImageIcon } from "lucide-react";
import { PosterCard } from "./CardGrid";

export default function Home({ items, animes, onNavigate, onOpen, onShareImage }) {
  const mangaItems = useMemo(() => items.filter((i) => i.category === "manga"), [items]);
  const gameItems = useMemo(() => items.filter((i) => i.category === "videojuego"), [items]);

  const recientes = useMemo(() => {
    const tagged = [
      ...items.map((i) => ({ ...i, kind: "item" })),
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
        <p>Tu colección de manga, anime y videojuegos, en un solo lugar.</p>
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
            <span className="hero__stat-icon"><Gamepad2 size={18} /></span>
            <div>
              <b>{gameItems.length}</b>
              <span>Videojuegos</span>
            </div>
          </div>
        </div>
        <div className="hero__actions">
          <button type="button" className="btn subtle" onClick={onShareImage}>
            <ImageIcon size={14} />
            Imagen de tu estante
          </button>
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
          <button type="button" className="quick-card quick-card--manga" onClick={() => onNavigate("manga")}>
            <BookOpen size={22} />
            <div>
              <b>{mangaItems.length}</b>
              <span>Manga</span>
            </div>
          </button>
          <button type="button" className="quick-card quick-card--anime" onClick={() => onNavigate("anime")}>
            <Tv size={22} />
            <div>
              <b>{animes.length}</b>
              <span>Anime</span>
            </div>
          </button>
          <button type="button" className="quick-card quick-card--videojuego" onClick={() => onNavigate("videojuego")}>
            <Gamepad2 size={22} />
            <div>
              <b>{gameItems.length}</b>
              <span>Videojuegos</span>
            </div>
          </button>
          <button type="button" className="quick-card quick-card--biblioteca" onClick={() => onNavigate("biblioteca")}>
            <Library size={22} />
            <div>
              <b>{items.length}</b>
              <span>Biblioteca completa</span>
            </div>
          </button>
        </div>
      </section>
    </div>
  );
}
