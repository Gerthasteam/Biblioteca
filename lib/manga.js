// Datos extra de una serie de manga, guardados en items.meta:
// {
//   owned: [1, 2, 5],               tomos que tenés
//   read: { "1": "2026-11-02" },    tomos leídos (con la fecha en que los marcaste)
//   publisher, format, language,    edición (Ivrea Argentina, B6 con sobrecubierta, Español…)
//   seriesStatus,                   "en_curso" | "finalizada" | "pausada" | "cancelada"
//   published: 110,                 tomos publicados en tu edición
//   next: { number, date },         próximo tomo que sale (para Novedades)
//   authors: ["Eiichiro Oda"], genres: ["Acción"],
//   anilistId, jpStatus, jpVolumes, datos de AniList (edición japonesa)
//   scores: { story, art, edition }, review: ""   reseña
// }
// Usado tanto por el servidor (cleanMeta, al guardar) como por la app.

export const SERIES_STATUS = [
  { key: "en_curso", label: "En curso" },
  { key: "finalizada", label: "Finalizada" },
  { key: "pausada", label: "Pausada" },
  { key: "cancelada", label: "Cancelada" }
];
export const SERIES_STATUS_LABEL = Object.fromEntries(SERIES_STATUS.map((s) => [s.key, s.label]));

export const PUBLISHERS = ["Ivrea Argentina", "Ivrea España", "Panini Argentina", "Panini México", "Larp Editores", "Planeta Cómic", "Norma Editorial", "Milky Way", "Kamite"];
export const FORMATS = ["B6 con sobrecubierta", "Tankoubon con sobrecubierta", "Rústica", "Kanzenban", "Deluxe", "Tapa dura"];
export const LANGUAGES = ["Español (Argentina)", "Español (España)", "Español (México)", "Inglés", "Japonés"];

// Géneros de AniList en castellano (los que no estén acá quedan como vienen).
export const GENRE_ES = {
  Action: "Acción", Adventure: "Aventura", Comedy: "Comedia", Drama: "Drama", Ecchi: "Ecchi", Fantasy: "Fantasía",
  Horror: "Terror", "Mahou Shoujo": "Mahō shōjo", Mecha: "Mecha", Music: "Música", Mystery: "Misterio",
  Psychological: "Psicológico", Romance: "Romance", "Sci-Fi": "Ciencia ficción", "Slice of Life": "Recuentos de la vida",
  Sports: "Deportes", Supernatural: "Sobrenatural", Thriller: "Suspenso", Hentai: "Hentai"
};

function intList(v, max = 2000) {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.map((n) => parseInt(n, 10)).filter((n) => Number.isFinite(n) && n > 0 && n <= max))].sort((a, b) => a - b);
}
function str(v, max = 80) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}
function strList(v, maxItems = 12, max = 60) {
  return Array.isArray(v) ? v.map((s) => str(s, max)).filter(Boolean).slice(0, maxItems) : [];
}
function score(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 && n <= 5 ? n : 0;
}

// Valida y recorta lo que llega del navegador antes de guardarlo. Devuelve
// null si no vino nada (así la ruta sabe que no tiene que tocar meta).
export function cleanMeta(m) {
  if (!m || typeof m !== "object" || Array.isArray(m)) return null;
  const read = {};
  if (m.read && typeof m.read === "object") {
    for (const [k, d] of Object.entries(m.read)) {
      const n = parseInt(k, 10);
      if (Number.isFinite(n) && n > 0 && n <= 2000) read[n] = /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : "";
    }
  }
  const nextNum = parseInt(m.next?.number, 10);
  const nextDate = /^\d{4}-\d{2}-\d{2}$/.test(m.next?.date || "") ? m.next.date : "";
  const published = parseInt(m.published, 10);
  const jpVolumes = parseInt(m.jpVolumes, 10);
  return {
    owned: intList(m.owned),
    read,
    publisher: str(m.publisher),
    format: str(m.format),
    language: str(m.language),
    seriesStatus: SERIES_STATUS_LABEL[m.seriesStatus] ? m.seriesStatus : "",
    published: Number.isFinite(published) && published > 0 && published <= 2000 ? published : null,
    next: Number.isFinite(nextNum) && nextNum > 0 ? { number: nextNum, date: nextDate } : null,
    authors: strList(m.authors, 6),
    genres: strList(m.genres, 12, 40),
    anilistId: parseInt(m.anilistId, 10) || null,
    jpStatus: str(m.jpStatus, 20),
    jpVolumes: Number.isFinite(jpVolumes) && jpVolumes > 0 ? jpVolumes : null,
    scores: { story: score(m.scores?.story), art: score(m.scores?.art), edition: score(m.scores?.edition) },
    review: str(m.review, 2000)
  };
}

// ---- cálculos sobre una serie (item de categoría manga) ----

export function mangaMeta(item) {
  return item?.meta || {};
}

// Hasta qué número de tomo mostrar: los publicados, o el más alto que
// tengas/hayas leído si no cargaste cuántos salieron.
export function volumeCount(item) {
  const m = mangaMeta(item);
  const maxOwned = Math.max(0, ...(m.owned || []));
  const maxRead = Math.max(0, ...Object.keys(m.read || {}).map(Number));
  const nextOut = m.next?.number && m.next.date && m.next.date <= todayLocal() ? m.next.number : 0;
  return Math.max(m.published || 0, maxOwned, maxRead, nextOut);
}

export function ownedSet(item) {
  return new Set(mangaMeta(item).owned || []);
}

// Tomos que te faltan: los publicados que no tenés (o, si no cargaste
// cuántos salieron, los huecos hasta el más alto que tenés), más el próximo
// tomo si ya pasó su fecha de salida.
export function missingVolumes(item) {
  const m = mangaMeta(item);
  const owned = ownedSet(item);
  const limit = m.published || Math.max(0, ...owned);
  const out = [];
  for (let i = 1; i <= limit; i++) if (!owned.has(i)) out.push(i);
  if (m.next?.number && m.next.date && m.next.date <= todayLocal() && !owned.has(m.next.number) && !out.includes(m.next.number)) {
    out.push(m.next.number);
  }
  return out;
}

// Pila de lectura: tomos que tenés y todavía no leíste.
export function unreadVolumes(item) {
  const m = mangaMeta(item);
  const read = m.read || {};
  return (m.owned || []).filter((n) => !(n in read));
}

export function hasVolumes(item) {
  const m = mangaMeta(item);
  return (m.owned || []).length > 0 || Object.keys(m.read || {}).length > 0 || !!m.published;
}

// Serie completa: tenés todos los tomos publicados y la serie terminó.
export function isComplete(item) {
  const m = mangaMeta(item);
  return !!m.published && m.seriesStatus === "finalizada" && missingVolumes(item).length === 0;
}

export function todayLocal() {
  return new Date().toLocaleDateString("en-CA");
}
