"use client";

import { posterBackground, statusDotColor, progressLabel, CATEGORY_UNIT, statusText } from "../../lib/ui";
import { useDragReorder } from "../../lib/useDragReorder";

export function PosterCard({ record, kind, isExample, onOpen, reorderable, dragging, dragHandlers }) {
  const unit = kind === "anime" ? "Ep." : record.unit || CATEGORY_UNIT[record.category] || "";
  const label = progressLabel(record.current, record.total, unit);
  return (
    <button
      type="button"
      className={"poster-card" + (isExample ? " poster-card__example" : "")}
      onClick={isExample ? undefined : () => onOpen(record.id)}
      title={record.title}
      draggable={reorderable || undefined}
      style={reorderable ? { opacity: dragging ? 0.35 : 1, cursor: "grab" } : undefined}
      {...(reorderable ? dragHandlers : {})}
    >
      <div className="poster-card__img" style={{ backgroundImage: posterBackground(record) }}>
        <span className="poster-card__badge" style={{ background: statusDotColor(record.status) }} />
      </div>
      <div className="poster-card__title">{(isExample ? "EJEMPLO · " : "") + record.title}</div>
      <div className="poster-card__meta">
        <span className="poster-card__dot" style={{ background: statusDotColor(record.status) }} />
        {statusText(record.status, kind)} · {label}
      </div>
    </button>
  );
}

export default function CardGrid({ records, kind, isExample, onOpen, reorderable, onReorder }) {
  const drag = useDragReorder(records, (r) => r.id, onReorder || (() => {}));
  const list = reorderable ? drag.list : records;

  return (
    <div className="poster-grid">
      {list.map((r, i) => (
        <PosterCard
          key={r.id || i}
          record={r}
          kind={kind}
          isExample={isExample}
          onOpen={onOpen}
          reorderable={reorderable}
          dragging={drag.draggingId === r.id}
          dragHandlers={{
            onDragStart: drag.onDragStart(r.id),
            onDragOver: drag.onDragOver(r.id),
            onDragEnd: drag.onDragEnd
          }}
        />
      ))}
    </div>
  );
}
