"use client";

import { useEffect, useRef, useState } from "react";

// Generic "hold and drag to reorder" hook, built on the native HTML5 drag
// and drop API (no extra dependency). `items` is the source-of-truth array
// coming from the parent; `getId` extracts a stable id from each item;
// `onCommit` is called once, on drop, with the final ordered id list.
export function useDragReorder(items, getId, onCommit) {
  const [list, setList] = useState(items);
  const [draggingId, setDraggingId] = useState(null);
  const dragId = useRef(null);

  useEffect(() => {
    setList(items);
  }, [items]);

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
      if (dragId.current == null || dragId.current === id) return;
      setList((prev) => {
        const from = prev.findIndex((x) => getId(x) === dragId.current);
        const to = prev.findIndex((x) => getId(x) === id);
        if (from === -1 || to === -1 || from === to) return prev;
        const next = prev.slice();
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
      });
    };
  }

  function onDragEnd() {
    dragId.current = null;
    setDraggingId(null);
    onCommit(list.map(getId));
  }

  return { list, draggingId, onDragStart, onDragOver, onDragEnd };
}
