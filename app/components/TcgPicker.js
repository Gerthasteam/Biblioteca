"use client";

import { useEffect, useState } from "react";
import { Search, ChevronLeft } from "lucide-react";

// Por ahora solo trabajamos con One Piece (Pokémon queda pausado). Cuando se
// vuelva a sumar, esto pasa a ser una lista de nuevo y se agrega el paso de
// elegir juego.
const GAME = "onepiece";

// Asistente guiado para cargar una carta: 1) set/expansión, 2) la carta
// puntual. Un breadcrumb permite volver atrás. onPick recibe { title, cover }
// igual que CoverSearch, más los datos del set para poder armar su carpeta.
export default function TcgPicker({ onPick }) {
  const [sets, setSets] = useState([]);
  const [loadingSets, setLoadingSets] = useState(true);
  const [setQuery, setSetQuery] = useState("");
  const [selectedSet, setSelectedSet] = useState(null);

  const [cards, setCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [cardQuery, setCardQuery] = useState("");
  const [error, setError] = useState(null);
  const [pickedId, setPickedId] = useState(null);

  useEffect(() => {
    setLoadingSets(true);
    setError(null);
    fetch(`/api/tcg/sets?game=${GAME}`)
      .then((r) => r.json())
      .then((json) => {
        setSets(json.sets || []);
        setError(json.error || null);
      })
      .catch(() => setError("fetch_failed"))
      .finally(() => setLoadingSets(false));
  }, []);

  useEffect(() => {
    if (!selectedSet) return;
    setLoadingCards(true);
    setError(null);
    setCards([]);
    fetch(`/api/tcg/cards?game=${GAME}&set=${encodeURIComponent(selectedSet.id)}`)
      .then((r) => r.json())
      .then((json) => {
        setCards(json.cards || []);
        setError(json.error || null);
      })
      .catch(() => setError("fetch_failed"))
      .finally(() => setLoadingCards(false));
  }, [selectedSet]);

  const shownSets = !setQuery
    ? sets
    : sets.filter((s) => s.name.toLowerCase().includes(setQuery.toLowerCase()));

  const shownCards = !cardQuery
    ? cards
    : cards.filter(
        (c) =>
          c.title.toLowerCase().includes(cardQuery.toLowerCase()) ||
          (c.number || "").toLowerCase().includes(cardQuery.toLowerCase())
      );

  return (
    <div className="tcg-picker">
      {selectedSet && (
        <div className="tcg-picker__crumbs">
          <button
            type="button"
            className="tcg-picker__crumb-btn"
            onClick={() => {
              setSelectedSet(null);
              setCards([]);
            }}
          >
            <ChevronLeft size={13} /> {selectedSet.name}
          </button>
        </div>
      )}

      {!selectedSet && (
        <div className="tcg-picker__step">
          <div className="tcg-picker__hint">Elegí el set / expansión</div>
          <span className="search-wrap tcg-picker__filter">
            <Search size={13} />
            <input
              type="text"
              className="search"
              placeholder="Filtrar sets…"
              value={setQuery}
              onChange={(e) => setSetQuery(e.target.value)}
            />
          </span>
          {loadingSets && <div className="search-picker__empty">Cargando sets…</div>}
          {!loadingSets && error && (
            <div className="search-picker__empty">No se pudieron cargar los sets — probá de nuevo.</div>
          )}
          {!loadingSets && !error && (
            <div className="tcg-picker__list">
              {shownSets.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="tcg-picker__set-btn"
                  onClick={() => setSelectedSet(s)}
                >
                  {s.logo && <img src={s.logo} alt="" className="tcg-picker__set-logo" />}
                  <span>
                    <div className="tcg-picker__set-name">{s.name}</div>
                    {(s.series || s.releaseDate) && (
                      <div className="tcg-picker__set-meta">
                        {[s.series, s.releaseDate?.slice(0, 4)].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </span>
                </button>
              ))}
              {shownSets.length === 0 && <div className="search-picker__empty">Sin resultados.</div>}
            </div>
          )}
        </div>
      )}

      {selectedSet && (
        <div className="tcg-picker__step">
          <div className="tcg-picker__hint">Elegí la carta</div>
          <span className="search-wrap tcg-picker__filter">
            <Search size={13} />
            <input
              type="text"
              className="search"
              placeholder="Filtrar cartas por nombre o número…"
              value={cardQuery}
              onChange={(e) => setCardQuery(e.target.value)}
            />
          </span>
          {loadingCards && <div className="search-picker__empty">Cargando cartas…</div>}
          {!loadingCards && error && (
            <div className="search-picker__empty">No se pudieron cargar las cartas — probá de nuevo.</div>
          )}
          {!loadingCards && !error && (
            <div className="tcg-picker__card-grid">
              {shownCards.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={"tcg-picker__card-btn" + (pickedId === c.id ? " active" : "")}
                  title={c.title}
                  onClick={() => {
                    setPickedId(c.id);
                    onPick({
                      title: c.title,
                      cover: c.cover,
                      total: null,
                      game: GAME,
                      setId: selectedSet.id,
                      setName: selectedSet.name,
                      cardId: c.id
                    });
                  }}
                >
                  {c.cover ? (
                    <img src={c.cover} alt="" className="tcg-picker__card-img" />
                  ) : (
                    <span className="tcg-picker__card-img" />
                  )}
                  <span className="tcg-picker__card-title">{c.title}</span>
                </button>
              ))}
              {shownCards.length === 0 && <div className="search-picker__empty">Sin resultados.</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
