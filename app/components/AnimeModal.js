"use client";

import { useState } from "react";
import StarPicker from "./StarPicker";
import CoverSearch from "./CoverSearch";

export default function AnimeModal({ editing, onClose, onSave, onDelete }) {
  const [title, setTitle] = useState(editing ? editing.title : "");
  const [status, setStatus] = useState(editing ? editing.status : "pendiente");
  const [current, setCurrent] = useState(editing ? editing.current : 0);
  const [total, setTotal] = useState(editing && editing.total != null ? editing.total : "");
  const [rating, setRating] = useState(editing ? editing.rating : 0);
  const [notes, setNotes] = useState(editing ? editing.notes : "");
  const [coverUrl, setCoverUrl] = useState(editing ? editing.coverUrl || "" : "");
  const [saving, setSaving] = useState(false);

  function submit(e) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    setSaving(true);
    onSave({
      title: t,
      status,
      current: parseInt(current || 0, 10),
      total: total === "" ? null : parseInt(total, 10),
      rating,
      notes: notes.trim(),
      coverUrl: coverUrl.trim() || null
    });
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={submit}>
        <h2>{editing ? "Editar anime" : "Nuevo anime"}</h2>

        <div className="field">
          <label htmlFor="animeTitle">Título</label>
          <input
            id="animeTitle"
            type="text"
            required
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoComplete="off"
          />
          <CoverSearch
            query={title}
            type="anime"
            onPick={(r) => {
              setTitle(r.title);
              if (r.cover) setCoverUrl(r.cover);
              if (r.total && total === "") setTotal(r.total);
            }}
          />
        </div>

        <div className="field">
          <label htmlFor="animeCover">URL de portada (opcional)</label>
          <input
            id="animeCover"
            type="text"
            placeholder="Se completa sola si la elegís de la búsqueda"
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="animeStatus">Estado</label>
          <select id="animeStatus" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="pendiente">Pendiente</option>
            <option value="viendo">Viendo</option>
            <option value="completo">Completo</option>
          </select>
        </div>

        <div className="row2">
          <div className="field">
            <label htmlFor="animeCurrent">Episodio actual</label>
            <input
              id="animeCurrent"
              type="number"
              min={0}
              step={1}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="animeTotal">Total (opcional)</label>
            <input
              id="animeTotal"
              type="number"
              min={0}
              step={1}
              placeholder="Ej: 12"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label>Puntaje</label>
          <StarPicker value={rating} onChange={setRating} />
        </div>

        <div className="field">
          <label htmlFor="animeNotes">Notas</label>
          <textarea
            id="animeNotes"
            maxLength={500}
            placeholder="Qué te pareció, temporada, lo que quieras recordar…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="modal__actions">
          {editing ? (
            <button type="button" className="btn subtle" onClick={onDelete}>
              Eliminar
            </button>
          ) : (
            <span />
          )}
          <div className="modal__actions-right">
            <button type="button" className="btn subtle" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn" disabled={saving}>
              Guardar
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
