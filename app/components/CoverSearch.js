"use client";

import { useEffect, useRef, useState } from "react";

// Debounced AniList search tied to a title field. Calling onPick fills in
// title + cover + total from the picked result.
const SOURCE_LABEL = { manga: "AniList", anime: "AniList", videojuego: "RAWG / Steam", tcg: "Pokémon / One Piece TCG" };

export default function CoverSearch({ query, type, onPick }) {
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?type=${type}&q=${encodeURIComponent(query)}`);
        const json = await res.json();
        if (!cancelled) {
          setResults(json.results || []);
          setError(json.error || null);
          setOpen(true);
        }
      } catch {
        if (!cancelled) {
          setResults([]);
          setError("fetch_failed");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, type]);

  useEffect(() => {
    function onDocClick(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  if (!open || query.trim().length < 2) return null;

  return (
    <div className="search-picker" ref={boxRef}>
      {loading && <div className="search-picker__empty">Buscando…</div>}
      {!loading && results.length === 0 && (
        <div className="search-picker__empty">Sin resultados en {SOURCE_LABEL[type] || "la búsqueda"} — podés cargarlo a mano.</div>
      )}
      {!loading &&
        results.map((r, i) => (
          <button
            type="button"
            key={i}
            className="search-picker__item"
            onClick={() => {
              onPick(r);
              setOpen(false);
            }}
          >
            {r.cover ? (
              <img className="search-picker__thumb" src={r.cover} alt="" />
            ) : (
              <span className="search-picker__thumb" />
            )}
            <span>
              <div className="search-picker__title">{r.title}</div>
              {(r.source || r.year) && (
                <div className="search-picker__year">{[r.source, r.year].filter(Boolean).join(" · ")}</div>
              )}
            </span>
          </button>
        ))}
    </div>
  );
}
