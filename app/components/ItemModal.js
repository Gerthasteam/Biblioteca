"use client";

import { useState } from "react";
import StarPicker from "./StarPicker";
import CoverSearch from "./CoverSearch";
import TcgPicker from "./TcgPicker";
import { CATEGORY_UNIT } from "../../lib/ui";
import { withTcgRef, newCardId } from "../../lib/tcgRef";

// tcgFolderTarget: { id, name } — cuando se agrega una carta desde adentro
// de una carpeta TCG armada a mano, en vez de mostrar el buscador de
// Pokémon/One Piece se carga a mano y se etiqueta directo en esa carpeta.
export default function ItemModal({ editing, defaultCategory, tcgFolderTarget, onClose, onSave, onDelete }) {
  const [title, setTitle] = useState(editing ? editing.title : "");
  const [category, setCategory] = useState(editing ? editing.category : tcgFolderTarget ? "tcg" : defaultCategory || "manga");
  // Una carta de TCG que buscás y cargás a mano ya la tenés — arranca "completo".
  const [status, setStatus] = useState(editing ? editing.status : category === "tcg" ? "completo" : "pendiente");
  const [unit, setUnit] = useState(editing ? editing.unit : "");
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
    let finalNotes = notes.trim();
    if (tcgFolderTarget && !editing) {
      finalNotes = withTcgRef(finalNotes, "custom", tcgFolderTarget.id, tcgFolderTarget.name, newCardId());
    }
    onSave({
      title: t,
      category,
      status,
      unit: unit.trim() || CATEGORY_UNIT[category],
      current: parseInt(current || 0, 10),
      total: total === "" ? null : parseInt(total, 10),
      rating,
      notes: finalNotes,
      coverUrl: coverUrl.trim() || null
    });
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={submit}>
        <h2>{editing ? "Editar título" : "Nuevo título"}</h2>

        <div className="field">
          <label htmlFor="itemTitle">Título</label>
          <input
            id="itemTitle"
            type="text"
            required
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoComplete="off"
          />
          {(category === "manga" || category === "videojuego") && (
            <CoverSearch
              query={title}
              type={category}
              onPick={(r) => {
                setTitle(r.title);
                if (r.cover) setCoverUrl(r.cover);
                if (r.total && total === "") setTotal(r.total);
              }}
            />
          )}
        </div>

        {category === "tcg" && tcgFolderTarget && !editing && (
          <div className="field">
            <div className="empty-note" style={{ margin: 0 }}>
              Se va a agregar a la carpeta <strong>{tcgFolderTarget.name}</strong>. Completá el título y, si
              querés, pegá una imagen abajo.
            </div>
          </div>
        )}

        {category === "tcg" && !tcgFolderTarget && (
          <div className="field">
            <label>Buscar carta</label>
            <TcgPicker
              onPick={(r) => {
                setTitle(r.title);
                if (r.cover) setCoverUrl(r.cover);
                if (r.total && total === "") setTotal(r.total);
                if (r.game && r.setId && r.cardId) {
                  setNotes((prev) => withTcgRef(prev, r.game, r.setId, r.setName, r.cardId));
                }
              }}
            />
          </div>
        )}

        {!tcgFolderTarget && (
          <div className="field">
            <label>Categoría</label>
            <div className="pill-group">
              {["manga", "tcg", "videojuego", "otro"].map((c) => (
                <button
                  key={c}
                  type="button"
                  className={category === c ? "active" : ""}
                  onClick={() => setCategory(c)}
                >
                  {{ manga: "Manga", tcg: "TCG", videojuego: "Videojuego", otro: "Otro" }[c]}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="field">
          <label htmlFor="itemStatus">Estado</label>
          <select id="itemStatus" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="pendiente">Pendiente</option>
            <option value="progreso">En progreso</option>
            <option value="completo">Completo</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="itemCover">URL de portada (opcional)</label>
          <input
            id="itemCover"
            type="text"
            placeholder="Se completa sola si buscás arriba (manga, videojuego o TCG)"
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
          />
        </div>

        {category !== "tcg" && (
          <>
            <div className="row2">
              <div className="field">
                <label htmlFor="itemUnit">Unidad de progreso</label>
                <input
                  id="itemUnit"
                  type="text"
                  maxLength={24}
                  placeholder={CATEGORY_UNIT[category]}
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="itemCurrent">Vas por</label>
                <input
                  id="itemCurrent"
                  type="number"
                  min={0}
                  step={1}
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="itemTotal">Total (opcional)</label>
              <input
                id="itemTotal"
                type="number"
                min={0}
                step={1}
                placeholder="Ej: 24"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
              />
            </div>
          </>
        )}

        <div className="field">
          <label>Puntaje</label>
          <StarPicker value={rating} onChange={setRating} />
        </div>

        <div className="field">
          <label htmlFor="itemNotes">Notas</label>
          <textarea
            id="itemNotes"
            maxLength={500}
            placeholder="Edición, dónde lo compraste, lo que quieras recordar…"
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
