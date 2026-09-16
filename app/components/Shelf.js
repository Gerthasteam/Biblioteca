"use client";

import { useEffect, useState } from "react";
import { spineWidth, spineBackground, spineHeadband, posterBackground } from "../../lib/ui";
import { useDragReorder } from "../../lib/useDragReorder";

// La vista previa grande al pasar el mouse solo tiene sentido con mouse de
// verdad. En celular, tocar el lomo dispara "hover" (foco) Y el click casi
// al mismo tiempo, así que se veía la portada grande Y se abría el detalle
// juntos. La detectamos con matchMedia así solo queda el toque → detalle.
function useCanHover() {
  const [canHover, setCanHover] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setCanHover(mq.matches);
    update();
    if (mq.addEventListener) mq.addEventListener("change", update);
    else mq.addListener(update);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", update);
      else mq.removeListener(update);
    };
  }, []);
  return canHover;
}

function Spine({ it, onClick, isExample, onHover, onLeave, reorderable, dragging, dragHandlers }) {
  const w = spineWidth(it);
  const label = (isExample ? "EJEMPLO · " : "") + it.title;
  return (
    <button
      type="button"
      className="spine"
      style={{
        width: w,
        background: spineBackground(it),
        cursor: isExample ? "default" : reorderable ? "grab" : "pointer",
        opacity: isExample ? 0.72 : dragging ? 0.35 : 1
      }}
      title={it.title}
      onClick={isExample ? undefined : onClick}
      onMouseEnter={isExample ? undefined : (e) => onHover(it, e.currentTarget)}
      onMouseLeave={isExample ? undefined : onLeave}
      onFocus={isExample ? undefined : (e) => onHover(it, e.currentTarget)}
      onBlur={isExample ? undefined : onLeave}
      draggable={(!isExample && reorderable) || undefined}
      {...(!isExample && reorderable ? dragHandlers : {})}
    >
      <span className="spine__headband" style={{ background: spineHeadband(it.status) }} />
      <span className="spine__label">{label}</span>
    </button>
  );
}

export default function Shelf({ items, isExample, onOpen, reorderable, onReorder }) {
  const [hover, setHover] = useState(null); // { it, left, top }
  const canHover = useCanHover();
  const drag = useDragReorder(items, (it) => it.id, onReorder || (() => {}));
  const list = reorderable ? drag.list : items;

  function handleHover(it, el) {
    if (!canHover) return;
    const rect = el.getBoundingClientRect();
    const previewW = 150;
    const gap = 14;
    const fitsRight = rect.right + gap + previewW + 10 <= window.innerWidth;
    const left = fitsRight ? rect.right + gap : rect.left - gap - previewW;
    const centerY = rect.top + rect.height / 2;
    const top = Math.max(130, Math.min(centerY, window.innerHeight - 130));
    setHover({ it, left, top });
  }
  function handleLeave() {
    setHover(null);
  }

  return (
    <>
      <div className="shelf-frame">
        <div className="shelf">
          {list.map((it, i) => (
            <Spine
              key={it.id || i}
              it={it}
              isExample={isExample}
              onClick={() => onOpen(it.id)}
              onHover={handleHover}
              onLeave={handleLeave}
              reorderable={reorderable}
              dragging={drag.draggingId === it.id}
              dragHandlers={{
                onDragStart: drag.onDragStart(it.id),
                onDragOver: drag.onDragOver(it.id),
                onDragEnd: drag.onDragEnd
              }}
            />
          ))}
        </div>
      </div>

      {hover && (
        <div className="spine-preview" style={{ left: hover.left, top: hover.top }}>
          <div className="spine-preview__img" style={{ backgroundImage: posterBackground(hover.it) }} />
          <div className="spine-preview__title">{hover.it.title}</div>
        </div>
      )}
    </>
  );
}
