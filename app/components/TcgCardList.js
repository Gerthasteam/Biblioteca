"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, Pencil } from "lucide-react";
import { posterBackground } from "../../lib/ui";
import { tcgCardKey, tcgQuantity, rarityRank, formatUsd } from "../../lib/tcgCard";

const STATUS_FILTERS = [
  { key: "todas", label: "Todas" },
  { key: "tengo", label: "Las tengo" },
  { key: "faltan", label: "Me faltan" }
];
const SORTS = [
  { key: "numero", label: "Número" },
  { key: "rareza", label: "Rareza" },
  { key: "precio", label: "Precio" },
  { key: "nombre", label: "Nombre" }
];

// Colores de One Piece (y tipos de Pokémon) para el puntito de color.
const COLOR_DOT = {
  red: "#E03131", green: "#2F9E44", blue: "#1C7ED6", purple: "#7048E8", black: "#343A40", yellow: "#F2C94C",
  fire: "#E03131", grass: "#2F9E44", water: "#1C7ED6", psychic: "#AE3EC9", darkness: "#343A40", lightning: "#F2C94C",
  fighting: "#C2581C", metal: "#868E96", dragon: "#B08A2E", fairy: "#E64980", colorless: "#CED4DA"
};

function numberSortKey(n) {
  const m = String(n || "").match(/\d+/g);
  return m ? parseInt(m[m.length - 1], 10) : Infinity;
}

// Vista de lista de una carpeta TCG (la alternativa a la carpeta de 3x3):
// todas las cartas en una grilla con número, rareza, color, si es paralela,
// precio y cuántas copias tenés, con filtros y orden. Los datos de la carta
// (info) vienen de la API del juego; las cartas de carpetas armadas a mano
// no tienen info y se muestran solo con nombre e imagen.
export default function TcgCardList({ items, info, prices, onToggleOwned, onSetQuantity, onEdit }) {
  const [status, setStatus] = useState("todas");
  const [rarity, setRarity] = useState("todas");
  const [color, setColor] = useState("todos");
  const [sort, setSort] = useState("numero");

  const rows = useMemo(
    () =>
      items.map((it, i) => {
        const key = tcgCardKey(it);
        const card = (info && info[key]) || {};
        return { it, i, key, card, price: prices?.[key] ?? card.price ?? null, qty: tcgQuantity(it) };
      }),
    [items, info, prices]
  );

  const rarities = useMemo(
    () => [...new Set(rows.map((r) => r.card.rarity).filter(Boolean))].sort((a, b) => rarityRank(a) - rarityRank(b) || a.localeCompare(b)),
    [rows]
  );
  const colors = useMemo(
    () => [...new Set(rows.flatMap((r) => (r.card.color || "").split(" ")).filter(Boolean))].sort(),
    [rows]
  );

  const shown = useMemo(() => {
    let list = rows.filter((r) => {
      if (status === "tengo" && r.qty === 0) return false;
      if (status === "faltan" && r.qty > 0) return false;
      if (rarity !== "todas" && r.card.rarity !== rarity) return false;
      if (color !== "todos" && !(r.card.color || "").split(" ").includes(color)) return false;
      return true;
    });
    const cmp = {
      // sin info de la API, el orden de la carpeta
      numero: (a, b) => numberSortKey(a.card.number) - numberSortKey(b.card.number) || a.i - b.i,
      rareza: (a, b) => rarityRank(a.card.rarity) - rarityRank(b.card.rarity) || (b.price ?? -1) - (a.price ?? -1),
      precio: (a, b) => (b.price ?? -1) - (a.price ?? -1),
      nombre: (a, b) => a.it.title.localeCompare(b.it.title)
    }[sort];
    return list.slice().sort(cmp);
  }, [rows, status, rarity, color, sort]);

  return (
    <div className="tcg-list">
      <div className="tcg-list__filters">
        <div className="tcg-list__chips">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s.key}
              type="button"
              className={"chip" + (status === s.key ? " active" : "")}
              onClick={() => setStatus(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="tcg-list__selects">
          {rarities.length > 0 && (
            <select value={rarity} onChange={(e) => setRarity(e.target.value)} aria-label="Rareza">
              <option value="todas">Todas las rarezas</option>
              {rarities.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          )}
          {colors.length > 0 && (
            <select value={color} onChange={(e) => setColor(e.target.value)} aria-label="Color">
              <option value="todos">Todos los colores</option>
              {colors.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Ordenar">
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                Ordenar: {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="empty-note">No hay cartas con esos filtros.</p>
      ) : (
        <div className="tcg-list__grid">
          {shown.map(({ it, key, card, price, qty }) => (
            <div key={it.id} className={"tcg-card" + (qty === 0 ? " tcg-card--off" : "")}>
              <button
                type="button"
                className="tcg-card__img"
                style={{ backgroundImage: posterBackground(it) }}
                title={qty > 0 ? `${it.title} · la tenés` : `${it.title} · no la tenés`}
                onClick={() => onToggleOwned(it)}
              >
                {card.variant && <span className="tcg-card__variant">{card.variant}</span>}
                {card.rarity && <span className="tcg-card__rarity">{card.rarity}</span>}
              </button>
              <div className="tcg-card__body">
                <div className="tcg-card__title" title={it.title}>
                  {it.title.replace(/\s*\([^)]*\)\s*$/, "") || it.title}
                </div>
                <div className="tcg-card__meta">
                  {card.color &&
                    card.color.split(" ").map((c) => (
                      <span key={c} className="tcg-card__dot" style={{ background: COLOR_DOT[c.toLowerCase()] || "#868E96" }} title={c} />
                    ))}
                  <span>{card.number || key || ""}</span>
                  {card.type && <span className="tcg-card__type">· {card.type}</span>}
                </div>
                <div className="tcg-card__bottom">
                  <span className="tcg-card__price">{price != null ? formatUsd(price) : ""}</span>
                  <span className="tcg-card__qty">
                    <button type="button" aria-label="Una copia menos" disabled={qty === 0} onClick={() => onSetQuantity(it, qty - 1)}>
                      <Minus size={12} />
                    </button>
                    <b>{qty}</b>
                    <button type="button" aria-label="Una copia más" onClick={() => onSetQuantity(it, qty + 1)}>
                      <Plus size={12} />
                    </button>
                  </span>
                </div>
              </div>
              <button type="button" className="tcg-card__edit" title="Editar detalles" onClick={() => onEdit(it.id)}>
                <Pencil size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
