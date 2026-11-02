"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Plus, Minus, Trash2, Pencil, Upload, Copy } from "lucide-react";
import { formatUsd } from "../../lib/tcgCard";
import TcgQuickAdd from "./TcgQuickAdd";

// Reglas de un mazo de One Piece: 1 líder + 50 cartas, hasta 4 copias de
// cada número.
const DECK_SIZE = 50;
const MAX_COPIES = 4;
const TYPE_ORDER = ["Leader", "Character", "Event", "Stage"];
const TYPE_LABEL = { Leader: "Líder", Character: "Personajes", Event: "Eventos", Stage: "Escenarios", "": "Otras" };

// Lista en texto, como las que se comparten en internet:
// "4xOP01-016", "4 OP01-016", "1x ST01-001 Luffy"…
export function parseDeckList(text) {
  const out = [];
  for (const line of String(text || "").split(/\r?\n/)) {
    const m = /^\s*(\d{1,2})\s*x?\s*([A-Z]{1,4}\d{0,2}-\d{3})/i.exec(line);
    if (m) out.push({ number: m[2].toUpperCase(), qty: parseInt(m[1], 10) });
  }
  return out;
}

function deckToText(deck) {
  return deck.cards.map((c) => `${c.qty}x${c.number}`).join("\n");
}

// Mazos de One Piece: lista de mazos y, adentro, el armado con lo que te
// falta (comparando con las copias que tenés de cada número, sumando
// normales y paralelas) y cuánto cuesta conseguirlo (versión más barata).
export default function TcgDecks({ ownedByNumber, onToast, onBack }) {
  const [decks, setDecks] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [lookup, setLookup] = useState({}); // número -> carta (con minPrice)
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const saveTimer = useRef(null);
  const requested = useRef(new Set());

  useEffect(() => {
    fetch("/api/tcg/decks")
      .then((r) => r.json())
      .then((json) => setDecks(json.decks || []))
      .catch(() => setDecks([]));
  }, []);

  // Pide los datos de las cartas de todos los mazos que todavía no tenemos.
  useEffect(() => {
    if (!decks) return;
    const missing = [...new Set(decks.flatMap((d) => d.cards.map((c) => c.number)))].filter(
      (n) => !requested.current.has(n)
    );
    if (!missing.length) return;
    missing.forEach((n) => requested.current.add(n));
    for (let i = 0; i < missing.length; i += 80) {
      const chunk = missing.slice(i, i + 80);
      fetch(`/api/tcg/search?game=onepiece&numbers=${encodeURIComponent(chunk.join(","))}`)
        .then((r) => r.json())
        .then((json) => json.byNumber && setLookup((prev) => ({ ...prev, ...json.byNumber })))
        .catch(() => chunk.forEach((n) => requested.current.delete(n)));
    }
  }, [decks]);

  function deckStats(deck) {
    let total = 0;
    let leaders = 0;
    let missing = 0;
    let cost = 0;
    let unknownPrice = 0;
    for (const c of deck.cards) {
      const info = lookup[c.number];
      if (info?.type === "Leader") leaders += c.qty;
      else total += c.qty;
      const have = ownedByNumber.get(c.number) || 0;
      const lack = Math.max(0, c.qty - have);
      missing += lack;
      if (lack) {
        if (info?.minPrice != null) cost += info.minPrice * lack;
        else unknownPrice += lack;
      }
    }
    const leader = deck.cards.map((c) => lookup[c.number]).find((i) => i?.type === "Leader");
    return { total, leaders, missing, cost, unknownPrice, leader };
  }

  function persist(deck, patch) {
    setDecks((prev) => prev.map((d) => (d.id === deck.id ? { ...d, ...patch } : d)));
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch(`/api/tcg/decks/${deck.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      }).catch(() => onToast("No se pudo guardar el mazo."));
    }, 500);
  }

  function setQty(deck, number, qty, isLeader) {
    const max = isLeader ? 1 : MAX_COPIES;
    const n = Math.max(0, Math.min(max, qty));
    let cards = deck.cards.map((c) => (c.number === number ? { ...c, qty: n } : c)).filter((c) => c.qty > 0);
    if (n > 0 && !cards.some((c) => c.number === number)) cards = [...cards, { number, qty: n }];
    // un mazo tiene un solo líder: elegir otro reemplaza al anterior
    if (isLeader && n > 0) cards = cards.filter((c) => c.number === number || lookup[c.number]?.type !== "Leader");
    persist(deck, { cards });
  }

  async function createDeck(name, cards = []) {
    try {
      const res = await fetch("/api/tcg/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game: "onepiece", name, cards })
      });
      const json = await res.json();
      if (!res.ok || !json.deck) throw new Error(json.message || "error");
      setDecks((prev) => [json.deck, ...(prev || [])]);
      setActiveId(json.deck.id);
    } catch (err) {
      onToast("No se pudo crear el mazo: " + err.message);
    }
  }

  function newDeck() {
    const name = window.prompt("Nombre del mazo:");
    if (name && name.trim()) createDeck(name.trim());
  }

  function deleteDeck(deck) {
    if (!window.confirm(`¿Borrar el mazo "${deck.name}"?`)) return;
    setDecks((prev) => prev.filter((d) => d.id !== deck.id));
    setActiveId(null);
    fetch(`/api/tcg/decks/${deck.id}`, { method: "DELETE" }).catch(() => onToast("No se pudo borrar el mazo."));
  }

  function renameDeck(deck) {
    const name = window.prompt("Nuevo nombre del mazo:", deck.name);
    if (name && name.trim() && name.trim() !== deck.name) persist(deck, { name: name.trim() });
  }

  function copyList(deck) {
    const text = deckToText(deck);
    navigator.clipboard?.writeText(text).then(
      () => onToast("Lista copiada."),
      () => window.prompt("Copiá la lista:", text)
    );
  }

  const active = decks?.find((d) => d && d.id === activeId) || null;

  if (decks === null) return <p className="section-header__sub">Cargando mazos…</p>;

  // ---- un mazo abierto ----
  if (active) {
    const s = deckStats(active);
    const groups = {};
    for (const c of active.cards) {
      const t = lookup[c.number]?.type || "";
      (groups[t] = groups[t] || []).push(c);
    }
    const order = [...TYPE_ORDER, ""].filter((t) => groups[t]?.length);
    return (
      <div className="tcg-deck">
        <div className="tcg-game-row">
          <button type="button" className="btn subtle" onClick={() => setActiveId(null)}>
            <ChevronLeft size={14} />
            Mis mazos
          </button>
          <button type="button" className="btn" onClick={() => setAdding(true)}>
            <Plus size={14} />
            Agregar carta
          </button>
          <button type="button" className="btn subtle" onClick={() => copyList(active)}>
            <Copy size={14} />
            Copiar lista
          </button>
          <button type="button" className="btn subtle" onClick={() => deleteDeck(active)}>
            <Trash2 size={14} />
            Borrar mazo
          </button>
        </div>
        <div className="tcg-deck__title">
          {s.leader?.cover && <img src={s.leader.cover} alt="" />}
          <h2>{active.name}</h2>
          <button type="button" className="icon-btn" title="Renombrar mazo" onClick={() => renameDeck(active)}>
            <Pencil size={14} />
          </button>
        </div>
        <div className="tcg-folder-stats">
          <div className="tcg-folder-stats__item">
            <b className={s.total === DECK_SIZE && s.leaders === 1 ? "tcg-value__delta--up" : ""}>
              {s.total}/{DECK_SIZE}
            </b>
            <span>cartas{s.leaders ? " + líder" : " · falta el líder"}</span>
          </div>
          <div className="tcg-folder-stats__item">
            <b className={s.missing ? "tcg-value__delta--down" : "tcg-value__delta--up"}>{s.missing}</b>
            <span>{s.missing ? "copias te faltan" : "¡lo tenés completo!"}</span>
          </div>
          {s.missing > 0 && (
            <div className="tcg-folder-stats__item">
              <b>{formatUsd(s.cost)}</b>
              <span>para completarlo{s.unknownPrice ? ` (+${s.unknownPrice} sin precio)` : ""}</span>
            </div>
          )}
        </div>

        {active.cards.length === 0 ? (
          <p className="empty-note">Mazo vacío — tocá "Agregar carta" y empezá por el líder.</p>
        ) : (
          order.map((t) => (
            <section key={t} className="tcg-deck__group">
              <h3>
                {TYPE_LABEL[t] || t} · {groups[t].reduce((n, c) => n + c.qty, 0)}
              </h3>
              {groups[t]
                .slice()
                .sort((a, b) => a.number.localeCompare(b.number))
                .map((c) => {
                  const info = lookup[c.number] || {};
                  const have = ownedByNumber.get(c.number) || 0;
                  const lack = Math.max(0, c.qty - have);
                  const isLeader = info.type === "Leader";
                  return (
                    <div key={c.number} className={"tcg-deck__row" + (lack ? " tcg-deck__row--lack" : "")}>
                      <span
                        className="tcg-quick__thumb"
                        style={{ backgroundImage: info.cover ? `url('${info.cover.replace(/'/g, "%27")}')` : undefined }}
                      />
                      <span className="tcg-quick__info">
                        <b>{info.title || c.number}</b>
                        <small>
                          {[c.number, info.rarity, info.color].filter(Boolean).join(" · ")}
                          {info.minPrice != null && <span className="tcg-quick__price">{formatUsd(info.minPrice)}</span>}
                        </small>
                        <small>
                          {lack ? (
                            <span className="tcg-deck__lack">Te falta{lack > 1 ? "n" : ""} {lack}</span>
                          ) : (
                            <span className="tcg-quick__have">Tenés {have}</span>
                          )}
                          {lack > 0 && have > 0 && <span>· tenés {have}</span>}
                        </small>
                      </span>
                      <span className="tcg-card__qty">
                        <button type="button" aria-label="Una menos" onClick={() => setQty(active, c.number, c.qty - 1, isLeader)}>
                          <Minus size={12} />
                        </button>
                        <b>{c.qty}</b>
                        <button
                          type="button"
                          aria-label="Una más"
                          disabled={c.qty >= (isLeader ? 1 : MAX_COPIES)}
                          onClick={() => setQty(active, c.number, c.qty + 1, isLeader)}
                        >
                          <Plus size={12} />
                        </button>
                      </span>
                    </div>
                  );
                })}
            </section>
          ))
        )}

        {adding && (
          <TcgQuickAdd
            title={`Agregar a "${active.name}"`}
            actionLabel="Al mazo"
            ownedQty={(key) => ownedByNumber.get(String(key).split("_")[0]) || 0}
            onAdd={(card) => {
              const number = String(card.number).toUpperCase();
              setLookup((prev) => (prev[number] ? prev : { ...prev, [number]: { ...card, minPrice: card.price } }));
              const cur = active.cards.find((x) => x.number === number)?.qty || 0;
              const isLeader = card.type === "Leader";
              if (!isLeader && cur >= MAX_COPIES) {
                onToast(`Ya tenés ${MAX_COPIES} copias de ${card.title} en el mazo (el máximo).`);
                return;
              }
              setQty(active, number, cur + 1, isLeader);
            }}
            onClose={() => setAdding(false)}
          />
        )}
      </div>
    );
  }

  // ---- lista de mazos ----
  return (
    <div className="tcg-decks">
      <div className="tcg-game-row">
        <button type="button" className="btn subtle" onClick={onBack}>
          <ChevronLeft size={14} />
          Mis TCG
        </button>
        <button type="button" className="btn" onClick={newDeck}>
          <Plus size={14} />
          Nuevo mazo
        </button>
        <button type="button" className="btn subtle" onClick={() => setImporting(true)}>
          <Upload size={14} />
          Importar lista
        </button>
      </div>
      {decks.length === 0 ? (
        <div className="empty-note empty-note--mascot">
          <img src="/mascot.png" alt="" />
          <p>
            Todavía no armaste ningún mazo — creá uno o pegá una lista (por ejemplo "4xOP01-016") con "Importar
            lista".
          </p>
        </div>
      ) : (
        <div className="tcg-set-grid">
          {decks.map((d) => {
            const s = deckStats(d);
            return (
              <button key={d.id} type="button" className="tcg-deck-tile" onClick={() => setActiveId(d.id)}>
                <span
                  className="tcg-deck-tile__img"
                  style={{ backgroundImage: s.leader?.cover ? `url('${s.leader.cover.replace(/'/g, "%27")}')` : undefined }}
                />
                <span className="tcg-deck-tile__body">
                  <b>{d.name}</b>
                  <small>
                    {s.total}/{DECK_SIZE} cartas{s.leaders ? "" : " · sin líder"}
                  </small>
                  <small className={s.missing ? "tcg-value__delta--down" : "tcg-value__delta--up"}>
                    {s.missing ? `Te faltan ${s.missing} · ${formatUsd(s.cost)}` : "Completo"}
                  </small>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {importing && (
        <ImportDeckModal
          onClose={() => setImporting(false)}
          onImport={(name, cards) => {
            setImporting(false);
            createDeck(name, cards);
          }}
        />
      )}
    </div>
  );
}

function ImportDeckModal({ onImport, onClose }) {
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const parsed = useMemo(() => parseDeckList(text), [text]);
  const count = parsed.reduce((n, c) => n + c.qty, 0);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>Importar lista</h2>
        <p className="section-header__sub" style={{ marginTop: -8 }}>
          Pegá la lista del mazo, una carta por línea: "4xOP01-016" o "4 OP01-016 Nami". Las líneas que no tengan ese
          formato se ignoran.
        </p>
        <div className="field">
          <label htmlFor="deckName">Nombre</label>
          <input id="deckName" type="text" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="deckText">Lista</label>
          <textarea id="deckText" rows={9} value={text} onChange={(e) => setText(e.target.value)} placeholder={"1xOP01-001\n4xOP01-016\n4xOP01-025"} />
          <span className="field__hint">
            {parsed.length} cartas distintas · {count} en total
          </span>
        </div>
        <div className="modal__actions">
          <button type="button" className="btn subtle" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn"
            disabled={!name.trim() || !parsed.length}
            onClick={() => onImport(name.trim(), parsed)}
          >
            Importar
          </button>
        </div>
      </div>
    </div>
  );
}
