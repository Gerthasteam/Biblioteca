"use client";

import { useEffect, useState } from "react";
import { Minus, Plus, Star, Pencil, Trash2 } from "lucide-react";
import { tcgQuantity, formatUsd, toUsd, fromUsd, moneyInPesos } from "../../lib/tcgCard";
import { parseTcgRef, parseSetName, formatSetCode, tcgCardKey } from "../../lib/tcgRef";

// Etiquetas de los datos de la carta, en el orden en que se muestran.
const DETAIL_LABELS = [
  ["cost", "Costo"],
  ["power", "Poder"],
  ["counter", "Counter"],
  ["life", "Vida"],
  ["hp", "HP"],
  ["attribute", "Atributo"],
  ["subTypes", "Tipos"],
  ["artist", "Ilustración"]
];

// Ventana con todo sobre una carta TCG: imagen grande, rareza, número,
// color, si es paralela, el texto/efecto, sus stats, el precio de mercado,
// cuántas copias tenés y la estrella de la lista de deseos. "Editar" abre
// el formulario de siempre (título, imagen, notas).
export default function TcgCardModal({ item, card, price, onClose, onSetQuantity, onToggleWish, onSetCost, onEdit, onDelete }) {
  // Lo que pagaste por copia, en la moneda que se está mostrando (se guarda
  // en dólares).
  const shownCost = item.cost != null ? fromUsd(item.cost) : null;
  const [costInput, setCostInput] = useState(shownCost != null ? String(Math.round(shownCost * 100) / 100) : "");
  function saveCost() {
    const raw = costInput.trim().replace(/\./g, moneyInPesos() ? "" : ".").replace(",", ".");
    if (!raw) {
      if (item.cost != null) onSetCost(item, null);
      return;
    }
    const usd = toUsd(raw);
    if (usd == null || usd < 0) return;
    if (item.cost == null || Math.abs(usd - item.cost) > 0.00005) onSetCost(item, Math.round(usd * 10000) / 10000);
  }
  const c = card || {};
  const d = c.details || {};
  const qty = tcgQuantity(item);
  const ref = parseTcgRef(item.notes);
  const setName = parseSetName(item.notes);
  const stats = DETAIL_LABELS.filter(([k]) => d[k] != null && d[k] !== "" && d[k] !== "-");
  // las notas sin las marcas internas (#tcgref y "Set: …")
  const notes = (item.notes || "").replace(/^Set: .+$/m, "").replace(/#tcgref:\S+/, "").trim();

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal--wide tcg-detail">
        <div className="tcg-detail__layout">
          <div
            className={"tcg-detail__img" + (qty === 0 ? " tcg-detail__img--off" : "")}
            style={{ backgroundImage: item.coverUrl ? `url('${item.coverUrl.replace(/'/g, "%27")}')` : undefined }}
          />
          <div className="tcg-detail__info">
            <div className="tcg-detail__tags">
              {c.rarity && <span className="tcg-detail__tag">{c.rarity}</span>}
              {c.variant && <span className="tcg-detail__tag tcg-detail__tag--variant">{c.variant}</span>}
              {c.type && <span className="tcg-detail__tag tcg-detail__tag--soft">{c.type}</span>}
              {c.color && <span className="tcg-detail__tag tcg-detail__tag--soft">{c.color}</span>}
            </div>
            <h2>{item.title}</h2>
            <div className="section-header__sub" style={{ marginTop: 0 }}>
              {[c.number, setName && `${setName}${ref && ref.game !== "custom" ? ` (${formatSetCode(ref.setId)})` : ""}`]
                .filter(Boolean)
                .join(" · ")}
            </div>

            <div className="tcg-detail__price">
              <b>{price != null ? formatUsd(price) : "Sin precio"}</b>
              <span>precio de mercado (TCGplayer)</span>
            </div>
            {ref && ref.game !== "custom" && <PriceHistory game={ref.game} cardKey={tcgCardKey(item)} />}

            <div className="tcg-detail__row">
              <span className="tcg-card__qty tcg-detail__qty">
                <button type="button" aria-label="Una copia menos" disabled={qty === 0} onClick={() => onSetQuantity(item, qty - 1)}>
                  <Minus size={14} />
                </button>
                <b>{qty}</b>
                <button type="button" aria-label="Una copia más" onClick={() => onSetQuantity(item, qty + 1)}>
                  <Plus size={14} />
                </button>
              </span>
              <span className="tcg-detail__qty-label">{qty === 0 ? "No la tenés" : qty === 1 ? "copia" : "copias"}</span>
              <button
                type="button"
                className={"btn subtle tcg-detail__wish" + (item.wish ? " active" : "")}
                onClick={() => onToggleWish(item)}
              >
                <Star size={14} fill={item.wish ? "currentColor" : "none"} />
                {item.wish ? "En tu lista de deseos" : "La busco"}
              </button>
            </div>

            <div className="tcg-detail__cost">
              <label htmlFor="tcgCost">Pagaste por copia {moneyInPesos() ? "($)" : "(US$)"}</label>
              <input
                id="tcgCost"
                type="text"
                inputMode="decimal"
                placeholder="—"
                value={costInput}
                onChange={(e) => setCostInput(e.target.value)}
                onBlur={saveCost}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              />
              {item.cost != null && price != null && qty > 0 && (
                <span className={(price - item.cost) * qty >= 0 ? "tcg-value__delta--up" : "tcg-value__delta--down"}>
                  {(price - item.cost) * qty >= 0 ? "Ganás +" : "Perdés −"}
                  {formatUsd(Math.abs((price - item.cost) * qty))}
                </span>
              )}
            </div>

            {stats.length > 0 && (
              <dl className="tcg-detail__stats">
                {stats.map(([k, label]) => (
                  <div key={k}>
                    <dt>{label}</dt>
                    <dd>{String(d[k])}</dd>
                  </div>
                ))}
              </dl>
            )}
            {d.text && <p className="tcg-detail__text">{d.text}</p>}
            {notes && <p className="tcg-detail__notes">{notes}</p>}
            {!card && ref && ref.game !== "custom" && (
              <p className="section-header__sub">Cargando datos de la carta…</p>
            )}
          </div>
        </div>

        <div className="modal__actions">
          <button type="button" className="btn subtle" onClick={onDelete}>
            <Trash2 size={14} />
            Borrar
          </button>
          <div className="modal__actions-right">
            <button type="button" className="btn subtle" onClick={onEdit}>
              <Pencil size={14} />
              Editar
            </button>
            <button type="button" className="btn" onClick={onClose}>
              Listo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Mini gráfico con la evolución del precio de la carta (lo que se fue
// guardando cada día que alguien entró a la app), con la variación desde el
// primer dato.
function PriceHistory({ game, cardKey }) {
  const [rows, setRows] = useState(null);
  const [hover, setHover] = useState(null);
  useEffect(() => {
    let cancel = false;
    fetch(`/api/tcg/price-history?game=${game}&key=${encodeURIComponent(cardKey)}`)
      .then((r) => r.json())
      .then((j) => !cancel && setRows(j.history || []))
      .catch(() => !cancel && setRows([]));
    return () => {
      cancel = true;
    };
  }, [game, cardKey]);
  if (!rows) return null;
  if (rows.length < 2) {
    return <p className="section-header__sub" style={{ margin: 0 }}>El historial de precio se arma día a día desde que la tenés cargada.</p>;
  }
  const W = 300;
  const H = 56;
  const vals = rows.map((r) => r.price);
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  const x = (i) => (i * W) / (rows.length - 1);
  const y = (v) => H - 4 - ((v - min) / (max - min || 1)) * (H - 8);
  const line = rows.map((r, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(r.price).toFixed(1)}`).join(" ");
  const first = rows[0].price;
  const last = rows[rows.length - 1].price;
  const change = first ? ((last - first) / first) * 100 : 0;
  const hp = hover != null ? rows[hover] : null;
  return (
    <div className="price-hist">
      <div className="price-hist__head">
        <span>
          Desde el {new Date(rows[0].day + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" }).replace(".", "")}
        </span>
        <span className={change >= 0 ? "tcg-value__delta--up" : "tcg-value__delta--down"}>
          {change >= 0 ? "+" : "−"}
          {Math.abs(change).toLocaleString("es-AR", { maximumFractionDigits: 1 })} %
        </span>
        {hp && (
          <span className="price-hist__tip">
            {formatUsd(hp.price)} · {new Date(hp.day + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" }).replace(".", "")}
          </span>
        )}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Precio: de ${formatUsd(first)} a ${formatUsd(last)}`}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setHover(Math.max(0, Math.min(rows.length - 1, Math.round(((e.clientX - r.left) / r.width) * (rows.length - 1)))));
        }}
        onPointerLeave={() => setHover(null)}
      >
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        {hp && <line x1={x(hover)} x2={x(hover)} y1="0" y2={H} stroke="var(--text-faint)" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />}
      </svg>
    </div>
  );
}
