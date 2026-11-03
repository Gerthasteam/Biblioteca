"use client";

import { useMemo, useState } from "react";
import { minutesWatched, AIRING_STATUS_LABEL } from "../../lib/anime";
import { ANIME_STATUS_LABEL } from "../../lib/ui";

function Thumb({ a }) {
  return <span className="manga-row__thumb" style={{ backgroundImage: a.coverUrl ? `url('${a.coverUrl.replace(/'/g, "%27")}')` : undefined }} />;
}

// ---- Calendario de emisión: próximos episodios de lo que seguís, por día ----
export function AnimeCalendar({ animes, airing, loading, onOpen }) {
  const followed = animes.filter((a) => a.status !== "completo");
  const withAiring = followed
    .map((a) => ({ a, air: a.meta?.anilistId ? airing[a.meta.anilistId] : null }))
    .filter((x) => x.air?.airingAt)
    .sort((x, y) => x.air.airingAt - y.air.airingAt);
  const unlinked = followed.filter((a) => !a.meta?.anilistId);

  const days = new Map();
  for (const x of withAiring) {
    const d = new Date(x.air.airingAt * 1000);
    const key = d.toLocaleDateString("en-CA");
    if (!days.has(key)) days.set(key, { date: d, rows: [] });
    days.get(key).rows.push(x);
  }
  const today = new Date().toLocaleDateString("en-CA");
  const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString("en-CA");

  return (
    <div className="manga-list">
      {loading && <p className="section-header__sub">Buscando próximos episodios…</p>}
      {!loading && withAiring.length === 0 && (
        <p className="empty-note">
          No hay episodios anunciados de lo que estás viendo. Los animes tienen que estar vinculados con AniList (pestaña
          Ficha → "Completar desde AniList") y estar en emisión.
        </p>
      )}
      {[...days].map(([key, day]) => (
        <section key={key}>
          <h3 className="manga-list__title">
            {key === today ? "Hoy" : key === tomorrow ? "Mañana" : day.date.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
          </h3>
          {day.rows.map(({ a, air }) => (
            <div key={a.id} className="manga-row">
              <Thumb a={a} />
              <div className="manga-row__body">
                <button type="button" className="manga-row__name" onClick={() => onOpen(a.id)}>
                  {a.title} <span className="manga-row__num">ep {air.episode}</span>
                </button>
                <small>
                  {new Date(air.airingAt * 1000).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} h · vas por el {a.current || 0}
                  {air.episode - 1 > (a.current || 0) ? ` · tenés ${air.episode - 1 - (a.current || 0)} para ponerte al día` : ""}
                </small>
              </div>
            </div>
          ))}
        </section>
      ))}
      {unlinked.length > 0 && (
        <section>
          <h3 className="manga-list__title">Sin vincular con AniList · {unlinked.length}</h3>
          <div className="manga-chips">
            {unlinked.map((a) => (
              <button key={a.id} type="button" className="manga-chip" onClick={() => onOpen(a.id)}>
                {a.title}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Bars({ rows }) {
  const max = rows[0]?.[1] || 1;
  return rows.map(([label, n]) => (
    <div key={label} className="tcg-stats__bar-row manga-stats__row">
      <span className="tcg-stats__label" title={label}>{label}</span>
      <span className="tcg-stats__bar">
        <span className="tcg-stats__bar-fill" style={{ width: Math.round((n / max) * 100) + "%" }} />
      </span>
      <span className="tcg-stats__num">{n}</span>
    </div>
  ));
}

function countBy(list, fn) {
  const m = new Map();
  for (const x of list) for (const k of fn(x)) if (k) m.set(k, (m.get(k) || 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1]);
}

// ---- Estadísticas de anime ----
export function AnimeStats({ animes }) {
  const [hover, setHover] = useState(null);
  const s = useMemo(() => {
    const eps = animes.reduce((n, a) => n + (a.current || 0), 0);
    const min = animes.reduce((n, a) => n + minutesWatched(a), 0);
    const months = [];
    const d = new Date();
    for (let i = 11; i >= 0; i--) {
      const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
      months.push({ key: x.toLocaleDateString("en-CA").slice(0, 7), label: x.toLocaleDateString("es-AR", { month: "short" }).replace(".", ""), n: 0 });
    }
    for (const a of animes) for (const [day, n] of Object.entries(a.meta?.watchLog || {})) {
      const mm = months.find((x) => day.startsWith(x.key));
      if (mm) mm.n += n;
    }
    return {
      eps,
      hours: Math.round(min / 60),
      done: animes.filter((a) => a.status === "completo").length,
      byStatus: countBy(animes, (a) => [ANIME_STATUS_LABEL[a.status]]),
      byGenre: countBy(animes, (a) => a.meta?.genres || []).slice(0, 8),
      byStudio: countBy(animes, (a) => a.meta?.studios || []).slice(0, 8),
      byAiring: countBy(animes, (a) => [AIRING_STATUS_LABEL[a.meta?.airingStatus]]),
      months
    };
  }, [animes]);
  const monthMax = Math.max(1, ...s.months.map((m) => m.n));

  return (
    <div className="manga-stats">
      <div className="tcg-folder-stats">
        {[
          [animes.length, "animes"],
          [s.eps, "episodios vistos"],
          [`${s.hours} h`, "de anime"],
          [s.done, "terminados"]
        ].map(([n, l]) => (
          <div key={l} className="tcg-folder-stats__item">
            <b>{n}</b>
            <span>{l}</span>
          </div>
        ))}
      </div>
      <div className="tcg-stats">
        <section className="tcg-stats__box manga-stats__months">
          <h3>Episodios vistos por mes</h3>
          <div className="manga-months" onPointerLeave={() => setHover(null)}>
            {s.months.map((m, i) => (
              <div key={m.key} className="manga-months__col" onPointerEnter={() => setHover(i)}>
                <span className="manga-months__val">{hover === i || (m.n === monthMax && m.n > 0) ? m.n : ""}</span>
                <span className="manga-months__bar" style={{ height: `${(m.n / monthMax) * 100}%` }} />
                <span className="manga-months__label">{m.label}</span>
              </div>
            ))}
          </div>
          <p className="section-header__sub" style={{ margin: "8px 0 0" }}>Se cuenta desde que empezás a sumar episodios con el + de cada anime.</p>
        </section>
        <section className="tcg-stats__box">
          <h3>Por estado</h3>
          {s.byStatus.length ? <Bars rows={s.byStatus} /> : <p className="section-header__sub">—</p>}
        </section>
        <section className="tcg-stats__box">
          <h3>Géneros</h3>
          {s.byGenre.length ? <Bars rows={s.byGenre} /> : <p className="section-header__sub">Usá "Completar desde AniList" en la ficha.</p>}
        </section>
        <section className="tcg-stats__box">
          <h3>Estudios</h3>
          {s.byStudio.length ? <Bars rows={s.byStudio} /> : <p className="section-header__sub">Usá "Completar desde AniList" en la ficha.</p>}
        </section>
      </div>
    </div>
  );
}
