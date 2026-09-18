"use client";

import { useEffect, useState } from "react";
import { Shuffle, BookOpen, ExternalLink } from "lucide-react";

// Mascota chibi + un globo de diálogo con un manga que todavía no tenés
// cargado — no elige entre los tuyos, te tira algo nuevo para descubrir.
// La recomendación sale de AniList (misma API que ya usa el buscador de
// portadas): antes probamos con la biblioteca de ZonaTMO, pero esos pedidos
// parecen quedar bloqueados justo cuando salen desde el servidor de Vercel
// — andaba bien probado a mano y siempre vacío ya desplegado. Como bonus,
// una vez que sabemos qué manga tocó, probamos (sin bloquear la respuesta)
// si ese título tiene ficha en ZonaTMO para leer directo; si ZonaTMO no
// responde simplemente no aparece ese botón extra.
export default function RecommendationModal({ mangaItems, onClose }) {
  // "loading" | "ok" | "empty" | "error"
  const [status, setStatus] = useState("loading");
  const [manga, setManga] = useState(null);
  const [zonatmoUrl, setZonatmoUrl] = useState(null);

  async function fetchRecommendation() {
    setStatus("loading");
    setZonatmoUrl(null);
    try {
      const res = await fetch("/api/anilist/random", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownedTitles: mangaItems.map((i) => i.title) })
      });
      const json = await res.json();
      if (json.manga) {
        setManga(json.manga);
        setStatus("ok");
        fetch(`/api/zonatmo/search?title=${encodeURIComponent(json.manga.title)}`)
          .then((r) => r.json())
          .then((zj) => {
            if (zj.url) setZonatmoUrl(zj.url);
          })
          .catch(() => {});
      } else {
        setManga(null);
        setStatus("empty");
      }
    } catch {
      setManga(null);
      setStatus("error");
    }
  }

  useEffect(() => {
    fetchRecommendation();
    // Solo al abrir el modal — "Otra" dispara un nuevo pedido a mano.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal recommend-modal">
        <h2>Recomendación</h2>

        {status === "loading" && (
          <p className="empty-note" style={{ margin: 0 }}>
            Buscando algo nuevo…
          </p>
        )}

        {status === "error" && (
          <p className="empty-note" style={{ margin: 0 }}>
            No se pudo conseguir una recomendación ahora. Probá de nuevo en un rato.
          </p>
        )}

        {status === "empty" && (
          <p className="empty-note" style={{ margin: 0 }}>
            No encontramos ningún manga que ya no tengas cargado. Probá de nuevo en un rato.
          </p>
        )}

        {status === "ok" && manga && (
          <div className="recommend">
            <div className="recommend__bubble">
              Te recomiendo <strong>“{manga.title}”</strong>
            </div>
            <img className="recommend__mascot" src="/mascot.png" alt="" />
          </div>
        )}

        <div className="modal__actions">
          <button
            type="button"
            className="btn subtle"
            onClick={fetchRecommendation}
            disabled={status === "loading"}
          >
            <Shuffle size={14} />
            Otra
          </button>
          <div className="modal__actions-right">
            <button type="button" className="btn subtle" onClick={onClose}>
              Cerrar
            </button>
            {status === "ok" && manga?.url && (
              <a href={manga.url} target="_blank" rel="noopener noreferrer" className="btn subtle zonatmo-link">
                <ExternalLink size={14} />
                Ver en AniList
              </a>
            )}
            {status === "ok" && zonatmoUrl && (
              <a href={zonatmoUrl} target="_blank" rel="noopener noreferrer" className="btn zonatmo-link">
                <BookOpen size={14} />
                Leer en ZonaTMO
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
