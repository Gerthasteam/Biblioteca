"use client";

import { useEffect, useRef, useState } from "react";

const LONG_PRESS_MS = 380; // cuánto hay que mantener el dedo apretado para "agarrar" el item
const MOVE_TOLERANCE = 10; // si el dedo se mueve más que esto antes, es un scroll, no un arrastre

// Generic "hold and drag to reorder" hook. Con mouse usa el drag and drop
// nativo de HTML5 (no extra dependency); en celular/tablet ese API no anda
// con el dedo, así que se suma un arrastre táctil propio: mantener apretado
// un ratito, y recién ahí mover. `items` is the source-of-truth array coming
// from the parent; `getId` extracts a stable id from each item; `onCommit`
// is called once, on drop, with the final ordered id list.
export function useDragReorder(items, getId, onCommit) {
  const [list, setList] = useState(items);
  const [draggingId, setDraggingId] = useState(null);
  const dragId = useRef(null);
  const listRef = useRef(items);
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;
  const touch = useRef(null); // { timer, x, y, active, cleanup }

  useEffect(() => {
    setList(items);
    listRef.current = items;
  }, [items]);

  useEffect(() => () => touch.current?.cleanup?.(), []);

  function moveOver(id) {
    if (dragId.current == null || String(dragId.current) === String(id)) return;
    setList((prev) => {
      const from = prev.findIndex((x) => getId(x) === dragId.current);
      const to = prev.findIndex((x) => String(getId(x)) === String(id));
      if (from === -1 || to === -1 || from === to) return prev;
      const next = prev.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      listRef.current = next;
      return next;
    });
  }

  function onDragStart(id) {
    return (e) => {
      dragId.current = id;
      setDraggingId(id);
      e.dataTransfer.effectAllowed = "move";
      try {
        e.dataTransfer.setData("text/plain", String(id));
      } catch {}
    };
  }

  function onDragOver(id) {
    return (e) => {
      e.preventDefault();
      moveOver(id);
    };
  }

  function onDragEnd() {
    dragId.current = null;
    setDraggingId(null);
    commitRef.current(listRef.current.map(getId));
  }

  // ---- arrastre táctil ----
  // Los listeners de React para touchmove son "pasivos" (no pueden frenar
  // el scroll), así que una vez agarrado el item los colgamos directo del
  // document con passive:false. El item que queda debajo del dedo se busca
  // con elementFromPoint + el atributo data-reorder-id.
  function onTouchStart(id) {
    return (e) => {
      if (e.touches.length !== 1) return;
      touch.current?.cleanup?.();
      const t = e.touches[0];
      const state = { x: t.clientX, y: t.clientY, active: false };

      const onMove = (ev) => {
        const p = ev.touches[0];
        if (!p) return;
        if (!state.active) {
          if (Math.abs(p.clientX - state.x) > MOVE_TOLERANCE || Math.abs(p.clientY - state.y) > MOVE_TOLERANCE) {
            cleanup();
          }
          return;
        }
        if (ev.cancelable) ev.preventDefault();
        const el = document.elementFromPoint(p.clientX, p.clientY);
        const target = el && el.closest("[data-reorder-id]");
        if (target) moveOver(target.getAttribute("data-reorder-id"));
      };
      const onEnd = () => {
        const wasActive = state.active;
        cleanup();
        if (!wasActive) return;
        // Después de soltar, el navegador puede disparar un click sobre el
        // item — lo comemos para que no se abra el detalle sin querer.
        const swallow = (ev) => {
          ev.stopPropagation();
          ev.preventDefault();
        };
        document.addEventListener("click", swallow, true);
        setTimeout(() => document.removeEventListener("click", swallow, true), 350);
        onDragEnd();
      };
      const onContextMenu = (ev) => ev.preventDefault();

      function cleanup() {
        clearTimeout(state.timer);
        document.removeEventListener("touchmove", onMove);
        document.removeEventListener("touchend", onEnd);
        document.removeEventListener("touchcancel", onEnd);
        document.removeEventListener("contextmenu", onContextMenu);
        if (touch.current === state) touch.current = null;
      }
      state.cleanup = cleanup;

      document.addEventListener("touchmove", onMove, { passive: false });
      document.addEventListener("touchend", onEnd);
      document.addEventListener("touchcancel", onEnd);
      document.addEventListener("contextmenu", onContextMenu);
      state.timer = setTimeout(() => {
        state.active = true;
        dragId.current = id;
        setDraggingId(id);
        try {
          navigator.vibrate?.(25);
        } catch {}
      }, LONG_PRESS_MS);
      touch.current = state;
    };
  }

  // Todo lo que hay que desparramar sobre cada item reordenable.
  function handlers(id) {
    return {
      "data-reorder-id": String(id),
      onDragStart: onDragStart(id),
      onDragOver: onDragOver(id),
      onDragEnd,
      onTouchStart: onTouchStart(id)
    };
  }

  return { list, draggingId, handlers };
}
