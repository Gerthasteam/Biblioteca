"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Star, Pencil, Check, Sparkles } from "lucide-react";
import StarPicker from "./StarPicker";
import {
  SERIES_STATUS,
  SERIES_STATUS_LABEL,
  PUBLISHERS,
  FORMATS,
  LANGUAGES,
  volumeCount,
  missingVolumes,
  unreadVolumes,
  todayLocal
} from "../../lib/manga";
import { stars } from "../../lib/ui";

const TABS = [
  ["tomos", "Tomos"],
  ["ficha", "Ficha"],
  ["resena", "Reseña"]
];

function parseList(s) {
  return String(s || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

// Ficha de una serie de manga (reemplaza al detalle genérico para manga):
// - Tomos: grilla #1…#N; tocar un tomo pasa por "no lo tengo" → "lo tengo"
//   → "lo leí" → otra vez "no lo tengo". Atajos para marcar de a muchos.
// - Ficha: edición (editorial, formato, idioma), estado de la serie, tomos
//   publicados, próximo tomo, autores y géneros (se pueden traer de AniList).
// - Reseña: puntaje por guion, dibujo y edición, y una reseña escrita.
// Todo se guarda en item.meta (ver lib/manga.js) con onSaveMeta.
export default function MangaModal({ item, onClose, onSaveMeta, onEdit, onDelete, onBump, onToggleWish }) {
  const [tab, setTab] = useState("tomos");
  const meta = item.meta || {};
  const [zonatmoUrl, setZonatmoUrl] = useState(null);

  useEffect(() => {
    setZonatmoUrl(null);
    let cancelled = false;
    fetch(`/api/zonatmo/search?title=${encodeURIComponent(item.title)}`)
      .then((r) => r.json())
      .then((j) => !cancelled && j.url && setZonatmoUrl(j.url))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [item.title]);

  const owned = useMemo(() => new Set(meta.owned || []), [meta.owned]);
  const read = meta.read || {};
  const count = volumeCount(item);
  const [extra, setExtra] = useState(0); // tomos de más mostrados con "+1 tomo"
  const shown = Math.max(count + extra, 0);
  const missing = missingVolumes(item);
  const pile = unreadVolumes(item);

  function save(patch) {
    onSaveMeta(item, { ...meta, ...patch });
  }

  function cycleVolume(n) {
    const o = new Set(owned);
    const r = { ...read };
    if (!o.has(n) && !(n in r)) o.add(n);
    else if (o.has(n) && !(n in r)) r[n] = todayLocal();
    else {
      o.delete(n);
      delete r[n];
    }
    save({ owned: [...o].sort((a, b) => a - b), read: r });
  }

  const [ownUpTo, setOwnUpTo] = useState("");
  const [readUpTo, setReadUpTo] = useState("");
  function markOwnedUpTo() {
    const n = parseInt(ownUpTo, 10);
    if (!n || n < 1) return;
    const o = new Set(owned);
    for (let i = 1; i <= n; i++) o.add(i);
    save({ owned: [...o].sort((a, b) => a - b), published: Math.max(meta.published || 0, n) || null });
    setOwnUpTo("");
  }
  function markReadUpTo() {
    const n = parseInt(readUpTo, 10);
    if (!n || n < 1) return;
    const o = new Set(owned);
    const r = { ...read };
    const day = todayLocal();
    for (let i = 1; i <= n; i++) {
      o.add(i);
      if (!(i in r)) r[i] = day;
    }
    save({ owned: [...o].sort((a, b) => a - b), read: r });
    setReadUpTo("");
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal--wide manga-modal">
        <div className="manga-modal__head">
          {item.coverUrl && <img className="manga-modal__cover" src={item.coverUrl} alt="" />}
          <div className="manga-modal__title">
            <span className="cat-label">
              Manga{meta.publisher ? ` · ${meta.publisher}` : ""}
              {meta.seriesStatus ? ` · ${SERIES_STATUS_LABEL[meta.seriesStatus]}` : ""}
            </span>
            <h2>{item.title}</h2>
            {meta.authors?.length > 0 && <div className="section-header__sub">{meta.authors.join(", ")}</div>}
            <div className="manga-modal__chips">
              <span>
                <b>{owned.size}</b>
                {meta.published ? `/${meta.published}` : ""} tomos
              </span>
              <span>
                <b>{Object.keys(read).length}</b> leídos
              </span>
              {pile.length > 0 && (
                <span>
                  <b>{pile.length}</b> sin leer
                </span>
              )}
              {missing.length > 0 && (
                <span className="manga-modal__chip--lack">
                  <b>{missing.length}</b> te faltan
                </span>
              )}
            </div>
            <div className="manga-modal__actions-top">
              <button type="button" className={"btn subtle" + (item.wish ? " tcg-detail__wish active" : "")} onClick={() => onToggleWish(item)}>
                <Star size={14} fill={item.wish ? "currentColor" : "none"} />
                {item.wish ? "En tu lista de deseos" : "Lo quiero"}
              </button>
              {zonatmoUrl && (
                <a href={zonatmoUrl} target="_blank" rel="noopener noreferrer" className="btn subtle zonatmo-link">
                  <BookOpen size={14} />
                  Leer en ZonaTMO
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="tcg-view-toggle manga-modal__tabs" role="tablist">
          {TABS.map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? "active" : ""} onClick={() => setTab(k)}>
              {label}
            </button>
          ))}
        </div>

        {tab === "tomos" && (
          <div className="manga-vols">
            <div className="manga-vols__quick">
              <span>
                Tengo del 1 al
                <input type="number" min={1} value={ownUpTo} onChange={(e) => setOwnUpTo(e.target.value)} />
                <button type="button" className="btn subtle" onClick={markOwnedUpTo}>
                  Marcar
                </button>
              </span>
              <span>
                Leí hasta el
                <input type="number" min={1} value={readUpTo} onChange={(e) => setReadUpTo(e.target.value)} />
                <button type="button" className="btn subtle" onClick={markReadUpTo}>
                  Marcar
                </button>
              </span>
            </div>
            {shown === 0 ? (
              <p className="empty-note">
                Todavía no hay tomos. Usá "Tengo del 1 al…", cargá cuántos salieron en la pestaña Ficha, o tocá "+1 tomo".
              </p>
            ) : (
              <>
                <p className="section-header__sub" style={{ margin: 0 }}>
                  Tocá un tomo: lo tengo → lo leí → no lo tengo.
                </p>
                <div className="manga-vols__grid">
                  {Array.from({ length: shown }, (_, i) => i + 1).map((n) => {
                    const has = owned.has(n);
                    const isRead = n in read;
                    return (
                      <button
                        key={n}
                        type="button"
                        className={"manga-vol" + (has ? " manga-vol--owned" : "") + (isRead ? " manga-vol--read" : "")}
                        title={isRead ? `Tomo ${n} · leído${read[n] ? " el " + read[n] : ""}` : has ? `Tomo ${n} · lo tenés` : `Tomo ${n} · no lo tenés`}
                        onClick={() => cycleVolume(n)}
                      >
                        <span>#{n}</span>
                        {isRead && <Check size={12} />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            <div className="manga-vols__legend">
              <span><i className="manga-vol manga-vol--owned" /> Lo tengo</span>
              <span><i className="manga-vol manga-vol--owned manga-vol--read" /> Leído</span>
              <span><i className="manga-vol" /> No lo tengo</span>
              <button type="button" className="tcg-value__link" onClick={() => setExtra((x) => x + 1)}>
                +1 tomo
              </button>
            </div>
            <div className="manga-vols__chapters">
              <span>
                Capítulo {item.current || 0}
                {item.total != null ? ` de ${item.total}` : ""}
              </span>
              <span className="bump-row" style={{ margin: 0 }}>
                <button type="button" aria-label="Restar uno" onClick={() => onBump(-1)}>−</button>
                <button type="button" aria-label="Sumar uno" onClick={() => onBump(1)}>+</button>
              </span>
            </div>
          </div>
        )}

        {tab === "ficha" && <FichaTab key={item.id} item={item} onSave={save} />}
        {tab === "resena" && <ResenaTab key={item.id} item={item} onSave={save} />}

        <div className="modal__actions">
          <button type="button" className="btn subtle" onClick={onDelete}>
            Eliminar
          </button>
          <div className="modal__actions-right">
            <button type="button" className="btn subtle" onClick={onEdit}>
              <Pencil size={14} />
              Editar
            </button>
            <button type="button" className="btn" onClick={onClose}>
              Listo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FichaTab({ item, onSave }) {
  const m = item.meta || {};
  const [f, setF] = useState({
    publisher: m.publisher || "",
    format: m.format || "",
    language: m.language || "",
    seriesStatus: m.seriesStatus || "",
    published: m.published || "",
    nextNumber: m.next?.number || "",
    nextDate: m.next?.date || "",
    authors: (m.authors || []).join(", "),
    genres: (m.genres || []).join(", ")
  });
  const [jp, setJp] = useState({ anilistId: m.anilistId || null, jpStatus: m.jpStatus || "", jpVolumes: m.jpVolumes || null });
  const [loadingAni, setLoadingAni] = useState(false);
  const [saved, setSaved] = useState(false);
  const set = (k) => (e) => {
    setF((p) => ({ ...p, [k]: e.target.value }));
    setSaved(false);
  };

  async function fromAniList() {
    setLoadingAni(true);
    try {
      const r = await fetch(`/api/search?type=manga&q=${encodeURIComponent(item.title)}`);
      const j = await r.json();
      const a = j.results?.[0]?.anilist;
      if (!a) return;
      setJp({ anilistId: a.anilistId, jpStatus: a.jpStatus, jpVolumes: a.jpVolumes });
      setF((p) => ({
        ...p,
        authors: p.authors || a.authors.join(", "),
        genres: p.genres || a.genres.join(", ")
      }));
      setSaved(false);
    } finally {
      setLoadingAni(false);
    }
  }

  function submit(e) {
    e.preventDefault();
    onSave({
      publisher: f.publisher,
      format: f.format,
      language: f.language,
      seriesStatus: f.seriesStatus,
      published: f.published ? parseInt(f.published, 10) : null,
      next: f.nextNumber ? { number: parseInt(f.nextNumber, 10), date: f.nextDate || "" } : null,
      authors: parseList(f.authors),
      genres: parseList(f.genres),
      ...jp
    });
    setSaved(true);
  }

  return (
    <form className="manga-ficha" onSubmit={submit}>
      <datalist id="mangaPublishers">{PUBLISHERS.map((p) => <option key={p} value={p} />)}</datalist>
      <datalist id="mangaFormats">{FORMATS.map((p) => <option key={p} value={p} />)}</datalist>
      <datalist id="mangaLanguages">{LANGUAGES.map((p) => <option key={p} value={p} />)}</datalist>
      <div className="row2">
        <div className="field">
          <label htmlFor="mPub">Editorial</label>
          <input id="mPub" type="text" list="mangaPublishers" value={f.publisher} onChange={set("publisher")} placeholder="Ivrea Argentina" />
        </div>
        <div className="field">
          <label htmlFor="mFmt">Formato</label>
          <input id="mFmt" type="text" list="mangaFormats" value={f.format} onChange={set("format")} placeholder="B6 con sobrecubierta" />
        </div>
        <div className="field">
          <label htmlFor="mLang">Idioma</label>
          <input id="mLang" type="text" list="mangaLanguages" value={f.language} onChange={set("language")} placeholder="Español (Argentina)" />
        </div>
        <div className="field">
          <label htmlFor="mStatus">Estado de tu edición</label>
          <select id="mStatus" value={f.seriesStatus} onChange={set("seriesStatus")}>
            <option value="">—</option>
            {SERIES_STATUS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="mPublished">Tomos publicados</label>
          <input id="mPublished" type="number" min={1} value={f.published} onChange={set("published")} placeholder="Ej: 110" />
        </div>
        <div className="field">
          <label>Próximo tomo</label>
          <div className="manga-ficha__next">
            <input type="number" min={1} value={f.nextNumber} onChange={set("nextNumber")} placeholder="#" aria-label="Número del próximo tomo" />
            <input type="date" value={f.nextDate} onChange={set("nextDate")} aria-label="Fecha de salida" />
          </div>
        </div>
      </div>
      <div className="field">
        <label htmlFor="mAuthors">Autores (separados por coma)</label>
        <input id="mAuthors" type="text" value={f.authors} onChange={set("authors")} placeholder="Eiichiro Oda" />
      </div>
      <div className="field">
        <label htmlFor="mGenres">Géneros (separados por coma)</label>
        <input id="mGenres" type="text" value={f.genres} onChange={set("genres")} placeholder="Acción, Aventura" />
      </div>
      <div className="manga-ficha__jp">
        <span>
          {jp.jpVolumes || jp.jpStatus
            ? `En Japón: ${jp.jpVolumes ? jp.jpVolumes + " tomos" : "tomos sin dato"}${jp.jpStatus ? " · " + (SERIES_STATUS_LABEL[jp.jpStatus] || jp.jpStatus).toLowerCase() : ""}`
            : "Sin datos de la edición japonesa."}
        </span>
        <button type="button" className="btn subtle" onClick={fromAniList} disabled={loadingAni}>
          <Sparkles size={14} />
          {loadingAni ? "Buscando…" : "Completar desde AniList"}
        </button>
      </div>
      <div className="manga-ficha__save">
        {saved && <span className="tcg-value__delta--up">Guardado</span>}
        <button type="submit" className="btn">
          Guardar ficha
        </button>
      </div>
    </form>
  );
}

function ResenaTab({ item, onSave }) {
  const m = item.meta || {};
  const [scores, setScores] = useState({ story: m.scores?.story || 0, art: m.scores?.art || 0, edition: m.scores?.edition || 0 });
  const [review, setReview] = useState(m.review || "");
  const [saved, setSaved] = useState(false);
  const avg = [scores.story, scores.art, scores.edition].filter(Boolean);
  return (
    <div className="manga-resena">
      <div className="manga-resena__overall">
        <span className="cat-label">Puntaje general</span>
        <span className="stars-line" style={{ fontSize: "1.1rem" }}>
          {stars(item.rating || 0)}
        </span>
        <small className="section-header__sub">(se cambia desde Editar)</small>
      </div>
      {[
        ["story", "Guion"],
        ["art", "Dibujo"],
        ["edition", "Edición"]
      ].map(([k, label]) => (
        <div key={k} className="manga-resena__row">
          <span>{label}</span>
          <StarPicker
            value={scores[k]}
            onChange={(v) => {
              setScores((s) => ({ ...s, [k]: v }));
              setSaved(false);
            }}
          />
        </div>
      ))}
      {avg.length > 0 && (
        <p className="section-header__sub" style={{ margin: 0 }}>
          Promedio: {(avg.reduce((a, b) => a + b, 0) / avg.length).toLocaleString("es-AR", { maximumFractionDigits: 1 })} / 5
        </p>
      )}
      <div className="field">
        <label htmlFor="mReview">Tu reseña</label>
        <textarea
          id="mReview"
          rows={5}
          maxLength={2000}
          value={review}
          onChange={(e) => {
            setReview(e.target.value);
            setSaved(false);
          }}
          placeholder="¿Qué te pareció? ¿Lo recomendarías?"
        />
        <span className="field__hint">{review.length}/2000</span>
      </div>
      <div className="manga-ficha__save">
        {saved && <span className="tcg-value__delta--up">Guardado</span>}
        <button
          type="button"
          className="btn"
          onClick={() => {
            onSave({ scores, review: review.trim() });
            setSaved(true);
          }}
        >
          Guardar reseña
        </button>
      </div>
    </div>
  );
}
