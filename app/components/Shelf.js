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

const SPINE_H = 190; // alto del lomo (igual que .spine en globals.css)

// Estante "un lomo por tomo": la portada de la serie se reparte entre sus
// lomos — cada tomo muestra una franja distinta, así que puestos en fila
// forman la imagen completa en vez de repetir el mismo recorte. Se escala
// como "cover" sobre el ancho total de todos los lomos (asumiendo portada
// 2:3) y cada lomo se corre lo que le toca.
function sliceStyle(it, w) {
  const { index, count } = it.slice;
  const totalW = w * count;
  const fitsWidth = totalW / SPINE_H > 2 / 3;
  const bgW = fitsWidth ? totalW : (SPINE_H * 2) / 3;
  const bgH = fitsWidth ? totalW * 1.5 : SPINE_H;
  const x = -(index * w) - (bgW - totalW) / 2;
  const y = -(bgH - SPINE_H) / 2;
  return {
    backgroundImage: `linear-gradient(rgba(0,0,0,.15), rgba(0,0,0,.5)), url('${it.coverUrl.replace(/'/g, "%27")}')`,
    backgroundSize: `100% 100%, ${bgW}px ${bgH}px`,
    backgroundPosition: `0 0, ${x}px ${y}px`,
    backgroundRepeat: "no-repeat"
  };
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
        ...(it.slice && it.coverUrl ? sliceStyle(it, w) : { background: spineBackground(it) }),
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
              dragHandlers={drag.handlers(it.id)}
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
