"use client";

import { Minus, Plus, Star, Pencil, Trash2 } from "lucide-react";
import { tcgQuantity, formatUsd } from "../../lib/tcgCard";
import { parseTcgRef, parseSetName, formatSetCode } from "../../lib/tcgRef";

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
export default function TcgCardModal({ item, card, price, onClose, onSetQuantity, onToggleWish, onEdit, onDelete }) {
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
