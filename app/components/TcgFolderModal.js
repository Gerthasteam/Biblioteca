"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { CATEGORY_UNIT } from "../../lib/ui";
import { withTcgRef, ownedCardIds } from "../../lib/tcgRef";

const GAME_LABEL = { pokemon: "Pokémon", onepiece: "One Piece" };

// Ventana para elegir una expansión de un juego puntual (el juego ya viene
// elegido por el botón que abrió esta ventana) y exportarla como una
// carpeta nueva, o abrir la carpeta si ya tiene cartas cargadas.
export default function TcgFolderModal({ game, items, onExport, onOpenFolder, onClose }) {
  const [sets, setSets] = useState([]);
  const [loadingSets, setLoadingSets] = useState(false);
  const [setQuery, setSetQuery] = useState("");
  const [selectedSet, setSelectedSet] = useState(null);

  const [cards, setCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setLoadingSets(true);
    setError(null);
    fetch(`/api/tcg/sets?game=${game}`)
      .then((r) => r.json())
      .then((json) => {
        setSets(json.sets || []);
        setError(json.error || null);
      })
      .catch(() => setError("fetch_failed"))
      .finally(() => setLoadingSets(false));
  }, [game]);

  useEffect(() => {
    if (!selectedSet) return;
    setLoadingCards(true);
    setError(null);
    setCards([]);
    fetch(`/api/tcg/cards?game=${game}&set=${encodeURIComponent(selectedSet.id)}`)
      .then((r) => r.json())
      .then((json) => {
        setCards(json.cards || []);
        setError(json.error || null);
      })
      .catch(() => setError("fetch_failed"))
      .finally(() => setLoadingCards(false));
  }, [game, selectedSet]);

  const owned = useMemo(
    () => (selectedSet ? ownedCardIds(items, game, selectedSet.id) : new Set()),
    [items, game, selectedSet]
  );
  const missing = useMemo(() => cards.filter((c) => !owned.has(c.id)), [cards, owned]);

  const shownSets = !setQuery ? sets : sets.filter((s) => s.name.toLowerCase().includes(setQuery.toLowerCase()));

  async function handleExport() {
    if (!missing.length) return;
    setExporting(true);
    const payload = missing.map((c) => ({
      title: c.title,
      category: "tcg",
      status: "pendiente",
      unit: CATEGORY_UNIT.tcg,
      current: 0,
      total: null,
      rating: 0,
      notes: withTcgRef("", game, selectedSet.id, selectedSet.name, c.id),
      coverUrl: c.cover || null
    }));
    try {
      await onExport(payload, { game, set: selectedSet });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>{GAME_LABEL[game]}</h2>
        <p className="section-header__sub" style={{ marginTop: -8 }}>
          {selectedSet
            ? "Exportá la expansión como carpeta nueva, o abrí la que ya tenés."
            : "Elegí la expansión — se va a crear una carpeta nueva con su nombre."}
        </p>

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
              ← Elegir otra expansión
            </button>
          </div>
        )}

        {!selectedSet && (
          <>
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
              <div className="tcg-picker__list" style={{ maxHeight: 320 }}>
                {shownSets.map((s) => (
                  <button key={s.id} type="button" className="tcg-picker__set-btn" onClick={() => setSelectedSet(s)}>
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
          </>
        )}

        {selectedSet && (
          <div className="tcg-folder-summary">
            {loadingCards && <div className="search-picker__empty">Cargando cartas del set…</div>}
            {!loadingCards && error && (
              <div className="search-picker__empty">No se pudieron cargar las cartas — probá de nuevo.</div>
            )}
            {!loadingCards && !error && (
              <>
                <div className="tcg-folder-summary__count">
                  {cards.length} cartas en {selectedSet.name}
                </div>
                <div className="tcg-folder-summary__sub">
                  {owned.size > 0
                    ? `Ya tenés ${owned.size} cargadas en tu carpeta.`
                    : "Todavía no exportaste nada de este set."}
                </div>
              </>
            )}
          </div>
        )}

        <div className="modal__actions">
          <button type="button" className="btn subtle" onClick={onClose}>
            Cancelar
          </button>
          {selectedSet && !loadingCards && !error && (
            <div className="modal__actions-right">
              {owned.size > 0 && (
                <button
                  type="button"
                  className="btn subtle"
                  onClick={() => onOpenFolder({ game, setId: selectedSet.id, setName: selectedSet.name })}
                >
                  Abrir carpeta
                </button>
              )}
              {missing.length > 0 && (
                <button type="button" className="btn" disabled={exporting} onClick={handleExport}>
                  {exporting ? "Exportando…" : `Exportar ${missing.length} carta${missing.length === 1 ? "" : "s"}`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
