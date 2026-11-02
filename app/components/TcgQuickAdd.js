"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Plus, Check } from "lucide-react";
import { formatUsd } from "../../lib/tcgCard";
import { formatSetCode } from "../../lib/tcgRef";

// Carga rápida de cartas de One Piece: escribís el código ("OP05-119",
// "op05119") o el nombre ("luffy") y sumás la versión que quieras con un
// toque — aunque no hayas exportado ese set (la carpeta se crea sola). Si ya
// la tenías, suma una copia más. Queda abierta para cargar varias seguidas.
export default function TcgQuickAdd({ ownedQty, onAdd, onClose, title = "Carga rápida", actionLabel = "Sumar" }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [justAdded, setJustAdded] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      setLoading(true);
      setError(false);
      fetch(`/api/tcg/search?game=onepiece&q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((json) => {
          if (cancelled) return;
          setResults(json.cards || []);
          setError(!!json.error);
        })
        .catch(() => !cancelled && setError(true))
        .finally(() => !cancelled && setLoading(false));
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  function add(card) {
    onAdd(card);
    setJustAdded(card.id);
    setTimeout(() => setJustAdded((x) => (x === card.id ? null : x)), 1200);
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal--wide">
        <h2>{title}</h2>
        <span className="search-wrap" style={{ width: "100%" }}>
          <Search size={14} />
          <input
            ref={inputRef}
            type="text"
            className="search"
            style={{ width: "100%" }}
            placeholder="Código (OP05-119) o nombre (Luffy)…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </span>

        <div className="tcg-quick__results">
          {q.trim().length < 2 && <p className="section-header__sub">Escribí al menos 2 letras o números.</p>}
          {loading && <p className="section-header__sub">Buscando…</p>}
          {!loading && error && <p className="section-header__sub">No se pudo buscar — probá de nuevo en un rato.</p>}
          {!loading && !error && q.trim().length >= 2 && results.length === 0 && (
            <p className="section-header__sub">No encontramos cartas con eso.</p>
          )}
          {results.map((c) => {
            const have = ownedQty ? ownedQty(c.id) : 0;
            return (
              <div key={c.id} className="tcg-quick__row">
                <span
                  className="tcg-quick__thumb"
                  style={{ backgroundImage: c.cover ? `url('${c.cover.replace(/'/g, "%27")}')` : undefined }}
                />
                <span className="tcg-quick__info">
                  <b>{c.title}</b>
                  <small>
                    {[c.number, c.rarity, c.setName && `${c.setName} (${formatSetCode(c.setId)})`].filter(Boolean).join(" · ")}
                  </small>
                  <small>
                    {c.variant && <span className="tcg-quick__variant">{c.variant}</span>}
                    {c.price != null && <span className="tcg-quick__price">{formatUsd(c.price)}</span>}
                    {have > 0 && <span className="tcg-quick__have">Tenés {have}</span>}
                  </small>
                </span>
                <button type="button" className="btn" onClick={() => add(c)}>
                  {justAdded === c.id ? <Check size={14} /> : <Plus size={14} />}
                  {justAdded === c.id ? "¡Listo!" : actionLabel}
                </button>
              </div>
            );
          })}
        </div>

        <div className="modal__actions">
          <span />
          <button type="button" className="btn subtle" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
