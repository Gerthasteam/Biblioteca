"use client";

import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import {
  CATEGORY_LABEL,
  CATEGORY_UNIT,
  ITEM_STATUS_LABEL,
  ANIME_STATUS_LABEL,
  stars,
  statusColorVars,
  statusDotColor,
  progressPct
} from "../../lib/ui";

export default function DetailModal({ kind, record, onClose, onEdit, onDelete, onBump }) {
  const isManga = kind === "item" && record?.category === "manga";
  const [zonatmoUrl, setZonatmoUrl] = useState(null);

  // Busca el link a ZonaTMO solo para manga, y solo cuando cambia el título
  // — si no hay coincidencia (o el sitio no responde) el botón simplemente
  // no aparece, no hace falta avisar nada.
  useEffect(() => {
    setZonatmoUrl(null);
    if (!isManga || !record?.title) return;
    let cancelled = false;
    fetch(`/api/zonatmo/search?title=${encodeURIComponent(record.title)}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json.url) setZonatmoUrl(json.url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isManga, record?.title]);

  if (!record) return null;
  const unit = kind === "item" ? record.unit || CATEGORY_UNIT[record.category] : "Episodio";
  const statusLabel = kind === "item" ? ITEM_STATUS_LABEL[record.status] : ANIME_STATUS_LABEL[record.status];
  const colors = statusColorVars(record.status);
  const pct = progressPct(record.current, record.total);

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        {record.coverUrl && (
          <div className="detail-cover">
            <img src={record.coverUrl} alt="" />
          </div>
        )}
        <div>
          <span className="cat-label">{kind === "item" ? CATEGORY_LABEL[record.category] : "Anime"}</span>
          <h2 style={{ marginTop: 4 }}>{record.title}</h2>
          <span className="status-pill" style={{ marginTop: 10, background: colors.bg, color: colors.fg }}>
            <span className="dot" style={{ background: statusDotColor(record.status) }} />
            {statusLabel}
          </span>
          {zonatmoUrl && (
            <a
              href={zonatmoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn subtle zonatmo-link"
              style={{ marginTop: 10 }}
            >
              <BookOpen size={14} />
              Leer en ZonaTMO
            </a>
          )}
        </div>
        {record.description && (
          <p style={{ fontSize: ".86rem", color: "var(--text-muted)", lineHeight: 1.5, margin: 0 }}>
            {record.description}
          </p>
        )}
        <div className="detail-progress">
          <div className="big">{unit} {record.current}</div>
          <div className="sub">{record.total != null ? `de ${record.total} en total` : "sin total cargado"}</div>
          {pct != null && (
            <div className="progress-bar">
              <div className="progress-bar__fill" style={{ width: pct + "%" }} />
            </div>
          )}
          <div className="bump-row">
            <button type="button" aria-label="Restar uno" onClick={() => onBump(-1)}>−</button>
            <button type="button" aria-label="Sumar uno" onClick={() => onBump(1)}>+</button>
          </div>
        </div>
        <div className="stars-line" style={{ fontSize: "1.15rem" }}>{stars(record.rating || 0)}</div>
        {record.notes && <p style={{ fontSize: ".88rem", color: "var(--text-muted)", whiteSpace: "pre-wrap", margin: 0 }}>{record.notes}</p>}
        <div className="modal__actions">
          <button type="button" className="btn subtle" onClick={onDelete}>Eliminar</button>
          <div className="modal__actions-right">
            <button type="button" className="btn subtle" onClick={onClose}>Cerrar</button>
            <button type="button" className="btn" onClick={onEdit}>Editar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
