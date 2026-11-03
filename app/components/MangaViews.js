"use client";

import { useMemo, useState } from "react";
import { Check, Star, CalendarClock } from "lucide-react";
import { missingVolumes, unreadVolumes, isComplete, todayLocal, SERIES_STATUS_LABEL } from "../../lib/manga";

function Thumb({ item }) {
  return (
    <span
      className="manga-row__thumb"
      style={{ backgroundImage: item.coverUrl ? `url('${item.coverUrl.replace(/'/g, "%27")}')` : undefined }}
    />
  );
}

function shortDate(day) {
  if (!day) return "";
  return new Date(day + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" }).replace(/ de /g, " ").replace(".", "");
}

// ---- Me faltan: tomos que te faltan por serie + series que querés empezar ----
export function MangaMissing({ items, onOpen, onSaveMeta, onToggleWish }) {
  const rows = items.map((it) => ({ it, missing: missingVolumes(it) })).filter((r) => r.missing.length);
  const total = rows.reduce((n, r) => n + r.missing.length, 0);
  const wanted = items.filter((it) => it.wish && !(it.meta?.owned || []).length);

  function markOwned(it, n) {
    const m = it.meta || {};
    onSaveMeta(it, { ...m, owned: [...new Set([...(m.owned || []), n])].sort((a, b) => a - b) });
  }

  return (
    <div className="manga-list">
      <section>
        <h3 className="manga-list__title">
          Tomos que te faltan {total > 0 && <span>· {total}</span>}
        </h3>
        {rows.length === 0 ? (
          <p className="empty-note">
            No te falta ningún tomo — o todavía no cargaste cuántos salieron. En la ficha de cada serie, pestaña Ficha,
            completá "Tomos publicados".
          </p>
        ) : (
          rows.map(({ it, missing }) => (
            <div key={it.id} className="manga-row">
              <Thumb item={it} />
              <div className="manga-row__body">
                <button type="button" className="manga-row__name" onClick={() => onOpen(it.id)}>
                  {it.title}
                </button>
                <small>
                  {[it.meta?.publisher, `te faltan ${missing.length}`].filter(Boolean).join(" · ")} — tocá un tomo cuando lo compres
                </small>
                <div className="manga-chips">
                  {missing.slice(0, 60).map((n) => (
                    <button key={n} type="button" className="manga-chip" onClick={() => markOwned(it, n)} title={`Ya compré el #${n}`}>
                      #{n}
                    </button>
                  ))}
                  {missing.length > 60 && <span className="manga-chip manga-chip--more">+{missing.length - 60}</span>}
                </div>
              </div>
            </div>
          ))
        )}
      </section>

      <section>
        <h3 className="manga-list__title">
          Quiero empezar {wanted.length > 0 && <span>· {wanted.length}</span>}
        </h3>
        {wanted.length === 0 ? (
          <p className="empty-note">Marcá con ★ "Lo quiero" en la ficha de una serie que todavía no empezaste para sumarla acá.</p>
        ) : (
          <div className="manga-want">
            {wanted.map((it) => (
              <div key={it.id} className="manga-want__item">
                <button type="button" className="manga-want__cover" onClick={() => onOpen(it.id)} style={{ backgroundImage: it.coverUrl ? `url('${it.coverUrl.replace(/'/g, "%27")}')` : undefined }} />
                <span>{it.title}</span>
                <button type="button" className="tcg-value__link" onClick={() => onToggleWish(it)}>
                  <Star size={11} fill="currentColor" /> Quitar
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ---- Desafío de lectura anual ----
// Meta de tomos para el año, cuántos llevás, si vas adelantado o atrasado
// según el día del año, y la racha de semanas seguidas leyendo algo.
export function readingYearStats(items, year) {
  const days = [];
  for (const it of items) for (const d of Object.values(it.meta?.read || {})) if (d) days.push(d);
  const thisYear = days.filter((d) => d.startsWith(String(year))).length;
  // racha de semanas (lunes a domingo) seguidas con al menos un tomo leído,
  // contando hasta esta semana (o la anterior, si esta todavía no leíste nada)
  const weekKey = (date) => {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dow = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - dow);
    return d.toLocaleDateString("en-CA");
  };
  const weeks = new Set(days.map((d) => weekKey(new Date(d + "T12:00:00"))));
  let streak = 0;
  const cur = new Date();
  if (!weeks.has(weekKey(cur))) cur.setDate(cur.getDate() - 7);
  while (weeks.has(weekKey(cur))) {
    streak++;
    cur.setDate(cur.getDate() - 7);
  }
  return { thisYear, streak };
}

export function ReadingGoal({ items, goal, onSetGoal }) {
  const year = new Date().getFullYear();
  const { thisYear, streak } = readingYearStats(items, year);
  const start = new Date(year, 0, 1);
  const dayOfYear = Math.floor((Date.now() - start.getTime()) / 86400000) + 1;
  const daysInYear = (new Date(year + 1, 0, 1) - start) / 86400000;
  const expected = goal ? Math.round((goal * dayOfYear) / daysInYear) : 0;
  const pct = goal ? Math.min(100, Math.round((thisYear / goal) * 100)) : 0;
  const diff = thisYear - expected;

  function edit() {
    const v = window.prompt(`¿Cuántos tomos querés leer en ${year}?`, goal || "");
    if (v === null) return;
    const n = parseInt(v, 10);
    onSetGoal(year, Number.isFinite(n) && n > 0 ? n : null);
  }

  return (
    <section className="reading-goal">
      <div className="reading-goal__head">
        <div>
          <span className="cat-label">Desafío de lectura {year}</span>
          <div className="reading-goal__num">
            <b>{thisYear}</b>
            {goal ? <span> de {goal} tomos</span> : <span> tomos leídos este año</span>}
          </div>
        </div>
        <button type="button" className="btn subtle" onClick={edit}>
          {goal ? "Cambiar meta" : "Ponerme una meta"}
        </button>
      </div>
      {goal ? (
        <>
          <div className="progress-bar" style={{ marginTop: 8 }}>
            <div className="progress-bar__fill" style={{ width: pct + "%" }} />
          </div>
          <p className="section-header__sub" style={{ margin: "6px 0 0" }}>
            {thisYear >= goal
              ? "¡Cumpliste la meta del año! 🎉"
              : diff >= 0
              ? `Vas ${diff} tomo${diff === 1 ? "" : "s"} adelantado para llegar a fin de año.`
              : `Vas ${-diff} tomo${diff === -1 ? "" : "s"} atrasado — a este ritmo deberías llevar ${expected}.`}
            {streak > 0 && ` · Racha: ${streak} semana${streak === 1 ? "" : "s"} seguida${streak === 1 ? "" : "s"} leyendo.`}
          </p>
        </>
      ) : (
        streak > 0 && <p className="section-header__sub" style={{ margin: "6px 0 0" }}>Racha: {streak} semana{streak === 1 ? "" : "s"} seguida{streak === 1 ? "" : "s"} leyendo.</p>
      )}
    </section>
  );
}

// ---- Pila de lectura: tomos que tenés y no leíste ----
export function MangaPile({ items, onOpen, onSaveMeta }) {
  const rows = items.map((it) => ({ it, unread: unreadVolumes(it) })).filter((r) => r.unread.length);
  const total = rows.reduce((n, r) => n + r.unread.length, 0);
  const month = todayLocal().slice(0, 7);
  const readThisMonth = items.reduce(
    (n, it) => n + Object.values(it.meta?.read || {}).filter((d) => d && d.startsWith(month)).length,
    0
  );

  function markRead(it, n) {
    const m = it.meta || {};
    onSaveMeta(it, { ...m, read: { ...(m.read || {}), [n]: todayLocal() } });
  }

  return (
    <div className="manga-list">
      <div className="tcg-folder-stats">
        <div className="tcg-folder-stats__item">
          <b>{total}</b>
          <span>tomos sin leer</span>
        </div>
        <div className="tcg-folder-stats__item">
          <b>{readThisMonth}</b>
          <span>leídos este mes</span>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="empty-note">¡Pila vacía! Leíste todo lo que tenés (o todavía no marcaste qué tomos tenés).</p>
      ) : (
        rows.map(({ it, unread }) => (
          <div key={it.id} className="manga-row">
            <Thumb item={it} />
            <div className="manga-row__body">
              <button type="button" className="manga-row__name" onClick={() => onOpen(it.id)}>
                {it.title}
              </button>
              <small>{unread.length} sin leer — tocá el tomo cuando lo termines</small>
              <div className="manga-chips">
                {unread.map((n) => (
                  <button key={n} type="button" className="manga-chip manga-chip--owned" onClick={() => markRead(it, n)} title={`Ya leí el #${n}`}>
                    <Check size={11} /> #{n}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ---- Novedades: próximos tomos de tus series ----
export function MangaNews({ items, onOpen }) {
  const today = todayLocal();
  const withNext = items.filter((it) => it.meta?.next?.number);
  const released = withNext
    .filter((it) => it.meta.next.date && it.meta.next.date <= today && !(it.meta.owned || []).includes(it.meta.next.number))
    .sort((a, b) => b.meta.next.date.localeCompare(a.meta.next.date));
  const upcoming = withNext
    .filter((it) => !it.meta.next.date || it.meta.next.date > today)
    .sort((a, b) => (a.meta.next.date || "9999").localeCompare(b.meta.next.date || "9999"));
  const ongoingNoNext = items.filter((it) => it.meta?.seriesStatus === "en_curso" && !it.meta?.next?.number);

  const Row = ({ it, label }) => (
    <div className="manga-row">
      <Thumb item={it} />
      <div className="manga-row__body">
        <button type="button" className="manga-row__name" onClick={() => onOpen(it.id)}>
          {it.title} <span className="manga-row__num">#{it.meta.next.number}</span>
        </button>
        <small>
          <CalendarClock size={11} /> {label}
          {it.meta.publisher ? ` · ${it.meta.publisher}` : ""}
        </small>
      </div>
    </div>
  );

  return (
    <div className="manga-list">
      <section>
        <h3 className="manga-list__title">Ya salió y no lo tenés {released.length > 0 && <span>· {released.length}</span>}</h3>
        {released.length === 0 ? (
          <p className="empty-note">Nada pendiente.</p>
        ) : (
          released.map((it) => <Row key={it.id} it={it} label={`salió el ${shortDate(it.meta.next.date)}`} />)
        )}
      </section>
      <section>
        <h3 className="manga-list__title">Próximamente {upcoming.length > 0 && <span>· {upcoming.length}</span>}</h3>
        {upcoming.length === 0 ? (
          <p className="empty-note">
            Cargá el próximo tomo (número y fecha) en la pestaña Ficha de tus series en curso — por ejemplo, del
            calendario de salidas de la editorial.
          </p>
        ) : (
          upcoming.map((it) => <Row key={it.id} it={it} label={it.meta.next.date ? `sale el ${shortDate(it.meta.next.date)}` : "sin fecha todavía"} />)
        )}
      </section>
      {ongoingNoNext.length > 0 && (
        <section>
          <h3 className="manga-list__title">En curso sin próximo tomo cargado · {ongoingNoNext.length}</h3>
          <div className="manga-chips">
            {ongoingNoNext.map((it) => (
              <button key={it.id} type="button" className="manga-chip" onClick={() => onOpen(it.id)}>
                {it.title}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ---- Estadísticas de la mangateca ----
function Bars({ rows, max }) {
  return rows.map(([label, n]) => (
    <div key={label} className="tcg-stats__bar-row manga-stats__row">
      <span className="tcg-stats__label" title={label}>{label}</span>
      <span className="tcg-stats__bar">
        <span className="tcg-stats__bar-fill" style={{ width: Math.round((n / (max || 1)) * 100) + "%" }} />
      </span>
      <span className="tcg-stats__num">{n}</span>
    </div>
  ));
}

function countBy(items, fn) {
  const m = new Map();
  for (const it of items) for (const k of fn(it)) if (k) m.set(k, (m.get(k) || 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1]);
}

export function MangaStats({ items }) {
  const [hover, setHover] = useState(null);
  const s = useMemo(() => {
    let owned = 0;
    let read = 0;
    let pile = 0;
    let complete = 0;
    for (const it of items) {
      owned += (it.meta?.owned || []).length;
      read += Object.keys(it.meta?.read || {}).length;
      pile += unreadVolumes(it).length;
      if (isComplete(it)) complete++;
    }
    // tomos por editorial (no series)
    const pubMap = new Map();
    for (const it of items) {
      const p = it.meta?.publisher;
      if (p) pubMap.set(p, (pubMap.get(p) || 0) + (it.meta.owned || []).length);
    }
    const byPublisher = [...pubMap].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
    // leídos por mes, últimos 12 meses
    const months = [];
    const d = new Date();
    d.setDate(1);
    for (let i = 11; i >= 0; i--) {
      const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
      months.push({ key: x.toLocaleDateString("en-CA").slice(0, 7), label: x.toLocaleDateString("es-AR", { month: "short" }).replace(".", ""), n: 0 });
    }
    for (const it of items) for (const day of Object.values(it.meta?.read || {})) {
      const mm = months.find((x) => day && day.startsWith(x.key));
      if (mm) mm.n++;
    }
    return {
      owned,
      read,
      pile,
      complete,
      byPublisher,
      byStatus: countBy(items, (it) => [SERIES_STATUS_LABEL[it.meta?.seriesStatus]]),
      byGenre: countBy(items, (it) => it.meta?.genres || []).slice(0, 8),
      byAuthor: countBy(items, (it) => it.meta?.authors || []).slice(0, 8),
      months
    };
  }, [items]);

  const monthMax = Math.max(1, ...s.months.map((m) => m.n));

  return (
    <div className="manga-stats">
      <div className="tcg-folder-stats">
        {[
          [items.length, "series"],
          [s.owned, "tomos tenés"],
          [s.read, "tomos leídos"],
          [s.pile, "en la pila"],
          [s.complete, "series completas"]
        ].map(([n, l]) => (
          <div key={l} className="tcg-folder-stats__item">
            <b>{n}</b>
            <span>{l}</span>
          </div>
        ))}
      </div>

      <div className="tcg-stats">
        <section className="tcg-stats__box manga-stats__months">
          <h3>Tomos leídos por mes</h3>
          <div className="manga-months" onPointerLeave={() => setHover(null)}>
            {s.months.map((m, i) => (
              <div key={m.key} className="manga-months__col" onPointerEnter={() => setHover(i)}>
                <span className="manga-months__val">{hover === i || m.n === monthMax ? m.n : ""}</span>
                <span className="manga-months__bar" style={{ height: `${(m.n / monthMax) * 100}%` }} />
                <span className="manga-months__label">{m.label}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="tcg-stats__box">
          <h3>Tomos por editorial</h3>
          {s.byPublisher.length ? <Bars rows={s.byPublisher} max={s.byPublisher[0][1]} /> : <p className="section-header__sub">Cargá la editorial en la ficha de cada serie.</p>}
        </section>
        <section className="tcg-stats__box">
          <h3>Series por estado</h3>
          {s.byStatus.length ? <Bars rows={s.byStatus} max={s.byStatus[0][1]} /> : <p className="section-header__sub">Cargá el estado en la ficha de cada serie.</p>}
        </section>
        <section className="tcg-stats__box">
          <h3>Géneros favoritos</h3>
          {s.byGenre.length ? <Bars rows={s.byGenre} max={s.byGenre[0][1]} /> : <p className="section-header__sub">Usá "Completar desde AniList" en la ficha.</p>}
        </section>
        <section className="tcg-stats__box">
          <h3>Autores</h3>
          {s.byAuthor.length ? <Bars rows={s.byAuthor} max={s.byAuthor[0][1]} /> : <p className="section-header__sub">Usá "Completar desde AniList" en la ficha.</p>}
        </section>
      </div>
    </div>
  );
}
