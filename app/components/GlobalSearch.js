"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, BookOpen, Tv, Layers, Package } from "lucide-react";
import { parseSetName } from "../../lib/tcgRef";

const KIND = {
  manga: { label: "Manga", icon: BookOpen },
  anime: { label: "Anime", icon: Tv },
  tcg: { label: "Carta TCG", icon: Layers },
  otro: { label: "Otro", icon: Package }
};

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

// Buscador de toda la colección (Ctrl+K): manga, anime, cartas TCG y "otros"
// a la vez. Flechas para moverse, Enter para abrir.
export default function GlobalSearch({ items, animes, onPick, onClose }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const all = [
      ...items.filter((it) => it.category !== "videojuego").map((it) => ({ kind: it.category in KIND ? it.category : "otro", rec: it })),
      ...animes.map((a) => ({ kind: "anime", rec: a }))
    ];
    const out = [];
    for (const r of all) {
      const extra = r.kind === "tcg" ? parseSetName(r.rec.notes) || "" : (r.rec.meta?.authors || []).join(" ");
      const hay = norm(`${r.rec.title} ${extra} ${r.rec.meta?.publisher || ""}`);
      if (words.every((w) => hay.includes(w))) {
        const starts = norm(r.rec.title).startsWith(words[0]) ? 0 : 1;
        out.push({ ...r, extra, rank: starts + (r.kind === "tcg" ? 1 : 0) });
      }
    }
    return out.sort((a, b) => a.rank - b.rank || a.rec.title.localeCompare(b.rec.title)).slice(0, 40);
  }, [q, items, animes]);

  useEffect(() => setSel(0), [q]);

  function onKey(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => Math.min(results.length - 1, s + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => Math.max(0, s - 1));
    } else if (e.key === "Enter" && results[sel]) {
      onPick(results[sel].kind, results[sel].rec.id);
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal--wide gsearch">
        <span className="search-wrap" style={{ width: "100%" }}>
          <Search size={15} />
          <input
            ref={inputRef}
            type="text"
            className="search gsearch__input"
            placeholder="Buscar en toda tu colección…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
          />
        </span>
        <div className="gsearch__results" role="listbox">
          {q.trim() && results.length === 0 && <p className="section-header__sub">Nada coincide con "{q}".</p>}
          {!q.trim() && <p className="section-header__sub">Escribí un título, un autor, una editorial o el nombre de una carta.</p>}
          {results.map((r, i) => {
            const K = KIND[r.kind];
            const Icon = K.icon;
            return (
              <button
                key={r.kind + r.rec.id}
                type="button"
                role="option"
                aria-selected={i === sel}
                className={"gsearch__row" + (i === sel ? " active" : "")}
                onMouseEnter={() => setSel(i)}
                onClick={() => onPick(r.kind, r.rec.id)}
              >
                <span
                  className="gsearch__thumb"
                  style={{ backgroundImage: r.rec.coverUrl ? `url('${r.rec.coverUrl.replace(/'/g, "%27")}')` : undefined }}
                />
                <span className="gsearch__info">
                  <b>{r.rec.title}</b>
                  <small>
                    <Icon size={11} /> {K.label}
                    {r.extra ? ` · ${r.extra}` : ""}
                  </small>
                </span>
              </button>
            );
          })}
        </div>
        <p className="gsearch__hint">↑ ↓ para moverte · Enter para abrir · Esc para cerrar</p>
      </div>
    </div>
  );
}
