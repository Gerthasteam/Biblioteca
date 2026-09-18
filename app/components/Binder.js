"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { posterBackground } from "../../lib/ui";
import { useDragReorder } from "../../lib/useDragReorder";

const SLOTS_DESKTOP = 9; // hoja "9-pocket" estándar de carpeta para cartas (3x3)
const SLOTS_MOBILE = 4; // en celular 9 quedaban chiquitas — 2x2 más grandes y fáciles de tocar

// Coincide con el breakpoint de @media (max-width:560px) en globals.css,
// que es donde el grid de la hoja pasa de 3 a 2 columnas.
function useSlotsPerPage() {
  const [slots, setSlots] = useState(SLOTS_DESKTOP);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 560px)");
    const update = () => setSlots(mq.matches ? SLOTS_MOBILE : SLOTS_DESKTOP);
    update();
    if (mq.addEventListener) mq.addEventListener("change", update);
    else mq.addListener(update);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", update);
      else mq.removeListener(update);
    };
  }, []);
  return slots;
}

function Pocket({ it, isExample, onToggle, onEdit, reorderable, dragging, dragHandlers }) {
  if (!it) return <div className="binder-pocket binder-pocket--empty" />;
  const owned = it.status === "completo";
  return (
    <div
      className={"binder-pocket" + (owned ? "" : " binder-pocket--off")}
      style={{ opacity: isExample ? 0.72 : dragging ? 0.3 : 1 }}
      draggable={(!isExample && reorderable) || undefined}
      {...(!isExample && reorderable ? dragHandlers : {})}
    >
      <button
        type="button"
        className="binder-pocket__toggle"
        style={{ cursor: isExample ? "default" : reorderable ? "grab" : "pointer" }}
        title={owned ? `${it.title} · la tenés` : `${it.title} · no la tenés`}
        onClick={isExample ? undefined : () => onToggle(it)}
      >
        <span className="binder-pocket__sleeve" style={{ backgroundImage: posterBackground(it) }} />
        <span className="binder-pocket__title">{(isExample ? "EJEMPLO · " : "") + it.title}</span>
      </button>
      {!isExample && onEdit && (
        <button
          type="button"
          className="binder-pocket__edit"
          title="Editar detalles"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(it.id);
          }}
        >
          <Pencil size={11} />
        </button>
      )}
    </div>
  );
}

// Carpeta negra de cartas para TCG: una sola hoja "9-pocket" (3x3) a la vez,
// con anillas al costado y flechas para pasar de página, como si hojearas
// la carpeta en vez de que se apilen todas las hojas una debajo de la otra.
// Click sobre la carta prende/apaga si la tenés o no; el lápiz abre el
// detalle para editarla.
export default function Binder({ items, isExample, onToggleOwned, onEdit, reorderable, onReorder }) {
  const slotsPerPage = useSlotsPerPage();
  const drag = useDragReorder(items, (it) => it.id, onReorder || (() => {}));
  const list = reorderable ? drag.list : items;

  const pages = [];
  for (let i = 0; i < list.length; i += slotsPerPage) pages.push(list.slice(i, i + slotsPerPage));
  if (pages.length === 0) pages.push([]);

  const [pageIndex, setPageIndex] = useState(0);
  useEffect(() => {
    if (pageIndex > pages.length - 1) setPageIndex(Math.max(0, pages.length - 1));
  }, [pages.length, pageIndex]);

  const page = pages[pageIndex] || [];
  const canPrev = pageIndex > 0;
  const canNext = pageIndex < pages.length - 1;

  return (
    <div className="binder">
      <button
        type="button"
        className="binder-nav"
        onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
        disabled={!canPrev}
        aria-label="Página anterior"
      >
        <ChevronLeft size={22} />
      </button>

      <div className="binder-sheet">
        <div className="binder-sheet__rings" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="binder-grid">
          {Array.from({ length: slotsPerPage }).map((_, i) => (
            <Pocket
              key={page[i]?.id ?? `p${pageIndex}-${i}`}
              it={page[i]}
              isExample={isExample}
              onToggle={onToggleOwned}
              onEdit={onEdit}
              reorderable={reorderable}
              dragging={page[i] && drag.draggingId === page[i].id}
              dragHandlers={
                page[i]
                  ? {
                      onDragStart: drag.onDragStart(page[i].id),
                      onDragOver: drag.onDragOver(page[i].id),
                      onDragEnd: drag.onDragEnd
                    }
                  : undefined
              }
            />
          ))}
        </div>
        {pages.length > 1 && (
          <div className="binder-sheet__page">
            Página {pageIndex + 1} / {pages.length}
          </div>
        )}
      </div>

      <button
        type="button"
        className="binder-nav"
        onClick={() => setPageIndex((p) => Math.min(pages.length - 1, p + 1))}
        disabled={!canNext}
        aria-label="Página siguiente"
      >
        <ChevronRight size={22} />
      </button>
    </div>
  );
}
