"use client";

import { useState } from "react";
import { Pencil, Sparkles, CalendarClock, BookOpen } from "lucide-react";
import StarPicker from "./StarPicker";
import { AIRING_STATUS_LABEL, minutesWatched } from "../../lib/anime";
import { ANIME_STATUS_LABEL, stars, progressPct } from "../../lib/ui";
import { volumeCount } from "../../lib/manga";

function parseList(s) {
  return String(s || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

// "jueves 14 nov, 13:30 (en 2 días)"
export function formatAiring(airingAt) {
  if (!airingAt) return "";
  const d = new Date(airingAt * 1000);
  const when = d.toLocaleString("es-AR", { weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).replace(".", "");
  const diff = d.getTime() - Date.now();
  const hours = Math.round(diff / 3600000);
  const rel = hours < 1 ? "en menos de una hora" : hours < 24 ? `en ${hours} h` : `en ${Math.round(hours / 24)} día${Math.round(hours / 24) === 1 ? "" : "s"}`;
  return `${when} (${rel})`;
}

function hoursLabel(min) {
  const h = Math.floor(min / 60);
  return h ? `${h} h ${min % 60} min` : `${min} min`;
}

// Ficha de un anime (reemplaza al detalle genérico): progreso con registro de
// lo que viste cada día, próximo episodio en vivo, ficha y reseña; y el manga
// de la misma obra si lo tenés.
export default function AnimeDetail({ anime, airing, relatedManga, onOpenManga, onClose, onBump, onSetProgress, onSaveMeta, onSetStatus, onEdit, onDelete }) {
  const [tab, setTab] = useState("progreso");
  const m = anime.meta || {};
  const pct = progressPct(anime.current, anime.total);
  const [upTo, setUpTo] = useState("");

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal--wide manga-modal">
        <div className="manga-modal__head">
          {anime.coverUrl && <img className="manga-modal__cover" src={anime.coverUrl} alt="" />}
          <div className="manga-modal__title">
            <span className="cat-label">
              Anime{m.format ? ` · ${m.format}` : ""}
              {m.seasonYear ? ` · ${m.seasonYear}` : ""}
              {m.studios?.length ? ` · ${m.studios.join(", ")}` : ""}
            </span>
            <h2>{anime.title}</h2>
            <div className="manga-modal__chips">
              <span>
                Ep <b>{anime.current || 0}</b>
                {anime.total ? `/${anime.total}` : ""}
              </span>
              <span>
                <b>{hoursLabel(minutesWatched(anime))}</b> vistos
              </span>
              {m.airingStatus && <span>{AIRING_STATUS_LABEL[m.airingStatus]}</span>}
            </div>
            <select className="anime-status" value={anime.status} onChange={(e) => onSetStatus(anime, e.target.value)} aria-label="Estado">
              {Object.entries(ANIME_STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>

        {relatedManga.length > 0 && (
          <div className="link-card">
            <BookOpen size={15} />
            <span>
              También tenés el manga:{" "}
              {relatedManga.map((it, i) => (
                <button key={it.id} type="button" className="tcg-value__link" onClick={() => onOpenManga(it.id)}>
                  {it.title}
                  {volumeCount(it) ? ` (${(it.meta?.owned || []).length} tomos)` : ""}
                  {i < relatedManga.length - 1 ? ", " : ""}
                </button>
              ))}
            </span>
          </div>
        )}

        <div className="tcg-view-toggle manga-modal__tabs" role="tablist">
          {[
            ["progreso", "Progreso"],
            ["ficha", "Ficha"],
            ["resena", "Reseña"]
          ].map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? "active" : ""} onClick={() => setTab(k)}>
              {label}
            </button>
          ))}
        </div>

        {tab === "progreso" && (
          <div className="manga-vols">
            <div className="detail-progress">
              <div className="big">Episodio {anime.current || 0}</div>
              <div className="sub">{anime.total != null ? `de ${anime.total} en total` : "sin total cargado"}</div>
              {pct != null && (
                <div className="progress-bar">
                  <div className="progress-bar__fill" style={{ width: pct + "%" }} />
                </div>
              )}
              <div className="bump-row">
                <button type="button" aria-label="Restar uno" onClick={() => onBump(anime, -1)}>−</button>
                <button type="button" aria-label="Sumar uno" onClick={() => onBump(anime, 1)}>+</button>
              </div>
            </div>
            <div className="manga-vols__quick">
              <span>
                Vi hasta el episodio
                <input type="number" min={0} value={upTo} onChange={(e) => setUpTo(e.target.value)} />
                <button
                  type="button"
                  className="btn subtle"
                  onClick={() => {
                    const n = parseInt(upTo, 10);
                    if (Number.isFinite(n) && n >= 0) onSetProgress(anime, n);
                    setUpTo("");
                  }}
                >
                  Marcar
                </button>
              </span>
            </div>
            {airing?.episode ? (
              <div className="link-card">
                <CalendarClock size={15} />
                <span>
                  El episodio <b>{airing.episode}</b> sale el {formatAiring(airing.airingAt)}
                </span>
              </div>
            ) : m.anilistId ? (
              <p className="section-header__sub" style={{ margin: 0 }}>No hay un próximo episodio anunciado en AniList.</p>
            ) : (
              <p className="section-header__sub" style={{ margin: 0 }}>
                Usá "Completar desde AniList" en la pestaña Ficha para ver cuándo sale el próximo episodio.
              </p>
            )}
          </div>
        )}

        {tab === "ficha" && <AnimeFicha key={anime.id} anime={anime} onSave={(p) => onSaveMeta(anime, { ...m, ...p })} />}

        {tab === "resena" && <AnimeResena key={anime.id} anime={anime} onSave={(p) => onSaveMeta(anime, { ...m, ...p })} />}

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

function AnimeFicha({ anime, onSave }) {
  const m = anime.meta || {};
  const [f, setF] = useState({
    studios: (m.studios || []).join(", "),
    format: m.format || "",
    seasonYear: m.seasonYear || "",
    duration: m.duration || "",
    genres: (m.genres || []).join(", "),
    airingStatus: m.airingStatus || "",
    anilistId: m.anilistId || null
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const set = (k) => (e) => {
    setF((p) => ({ ...p, [k]: e.target.value }));
    setSaved(false);
  };

  async function fromAniList() {
    setLoading(true);
    try {
      const r = await fetch(`/api/search?type=anime&q=${encodeURIComponent(anime.title)}`);
      const j = await r.json();
      const a = j.results?.[0]?.anilist;
      if (!a) return;
      setF((p) => ({
        studios: p.studios || (a.studios || []).join(", "),
        format: p.format || a.format || "",
        seasonYear: p.seasonYear || a.seasonYear || "",
        duration: p.duration || a.duration || "",
        genres: p.genres || (a.genres || []).join(", "),
        airingStatus: a.airingStatus || p.airingStatus,
        anilistId: a.anilistId
      }));
      setSaved(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className="manga-ficha"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          studios: parseList(f.studios),
          format: f.format,
          seasonYear: f.seasonYear ? parseInt(f.seasonYear, 10) : null,
          duration: f.duration ? parseInt(f.duration, 10) : null,
          genres: parseList(f.genres),
          airingStatus: f.airingStatus,
          anilistId: f.anilistId
        });
        setSaved(true);
      }}
    >
      <div className="row2">
        <div className="field">
          <label htmlFor="aStudio">Estudio</label>
          <input id="aStudio" type="text" value={f.studios} onChange={set("studios")} placeholder="MAPPA" />
        </div>
        <div className="field">
          <label htmlFor="aFormat">Formato</label>
          <input id="aFormat" type="text" value={f.format} onChange={set("format")} placeholder="Serie, Película…" />
        </div>
        <div className="field">
          <label htmlFor="aYear">Año</label>
          <input id="aYear" type="number" value={f.seasonYear} onChange={set("seasonYear")} />
        </div>
        <div className="field">
          <label htmlFor="aDur">Minutos por episodio</label>
          <input id="aDur" type="number" value={f.duration} onChange={set("duration")} placeholder="24" />
        </div>
        <div className="field">
          <label htmlFor="aAiring">Emisión</label>
          <select id="aAiring" value={f.airingStatus} onChange={set("airingStatus")}>
            <option value="">—</option>
            {Object.entries(AIRING_STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="aGenres">Géneros (separados por coma)</label>
        <input id="aGenres" type="text" value={f.genres} onChange={set("genres")} />
      </div>
      <div className="manga-ficha__jp">
        <span>{f.anilistId ? "Vinculado con AniList: se ve el próximo episodio en el calendario." : "Sin vincular con AniList."}</span>
        <button type="button" className="btn subtle" onClick={fromAniList} disabled={loading}>
          <Sparkles size={14} />
          {loading ? "Buscando…" : "Completar desde AniList"}
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

function AnimeResena({ anime, onSave }) {
  const m = anime.meta || {};
  const [scores, setScores] = useState({ story: m.scores?.story || 0, animation: m.scores?.animation || 0, sound: m.scores?.sound || 0 });
  const [review, setReview] = useState(m.review || "");
  const [saved, setSaved] = useState(false);
  return (
    <div className="manga-resena">
      <div className="manga-resena__overall">
        <span className="cat-label">Puntaje general</span>
        <span className="stars-line" style={{ fontSize: "1.1rem" }}>
          {stars(anime.rating || 0)}
        </span>
        <small className="section-header__sub">(se cambia desde Editar)</small>
      </div>
      {[
        ["story", "Historia"],
        ["animation", "Animación"],
        ["sound", "Sonido"]
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
      <div className="field">
        <label htmlFor="aReview">Tu reseña</label>
        <textarea id="aReview" rows={5} maxLength={2000} value={review} onChange={(e) => { setReview(e.target.value); setSaved(false); }} />
      </div>
      <div className="manga-ficha__save">
        {saved && <span className="tcg-value__delta--up">Guardado</span>}
        <button type="button" className="btn" onClick={() => { onSave({ scores, review: review.trim() }); setSaved(true); }}>
          Guardar reseña
        </button>
      </div>
    </div>
  );
}
