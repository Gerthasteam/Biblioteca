"use client";

import { ANIME_STATUS_LABEL, stars } from "../../lib/ui";

export default function TicketList({ animes, isExample, onOpen }) {
  return (
    <div className="tickets">
      {animes.map((a, i) => {
        const meta = a.total ? `Episodio ${a.current} / ${a.total}` : `Episodio ${a.current}`;
        return (
          <button
            type="button"
            key={a.id || i}
            className="ticket"
            style={{ cursor: isExample ? "default" : "pointer" }}
            onClick={isExample ? undefined : () => onOpen(a.id)}
          >
            <div className="ticket__thumb">{a.coverUrl && <img src={a.coverUrl} alt="" />}</div>
            <div className="ticket__main">
              <div className="ticket__title">{(isExample ? "EJEMPLO · " : "") + a.title}</div>
              <div className="ticket__meta">{ANIME_STATUS_LABEL[a.status]} · {meta}</div>
            </div>
            <div className="ticket__stars">{stars(a.rating || 0)}</div>
          </button>
        );
      })}
    </div>
  );
}
