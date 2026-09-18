"use client";

import { useState } from "react";
import { Shuffle } from "lucide-react";

function pickRandomId(list, excludeId) {
  if (!list.length) return null;
  if (list.length === 1) return list[0].id;
  let next;
  do {
    next = list[Math.floor(Math.random() * list.length)].id;
  } while (next === excludeId);
  return next;
}

// Mascota chibi + un globo de diálogo con un manga al azar de tu colección
// — pensado para cuando no sabés qué leer y querés que la app te tire una idea.
export default function RecommendationModal({ mangaItems, onClose, onOpenDetail }) {
  const [pickId, setPickId] = useState(() => pickRandomId(mangaItems, null));
  const pick = mangaItems.find((i) => i.id === pickId) || null;

  function reroll() {
    setPickId((current) => pickRandomId(mangaItems, current));
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal recommend-modal">
        <h2>Recomendación</h2>

        {!pick ? (
          <p className="empty-note" style={{ margin: 0 }}>
            Todavía no tenés ningún manga cargado para recomendarte — agregá alguno primero.
          </p>
        ) : (
          <div className="recommend">
            <div className="recommend__bubble">
              Te recomiendo <strong>“{pick.title}”</strong>
            </div>
            <img className="recommend__mascot" src="/mascot.png" alt="" />
          </div>
        )}

        <div className="modal__actions">
          {pick && mangaItems.length > 1 ? (
            <button type="button" className="btn subtle" onClick={reroll}>
              <Shuffle size={14} />
              Otra
            </button>
          ) : (
            <span />
          )}
          <div className="modal__actions-right">
            <button type="button" className="btn subtle" onClick={onClose}>
              Cerrar
            </button>
            {pick && (
              <button type="button" className="btn" onClick={() => onOpenDetail(pick.id)}>
                Ver ficha
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
