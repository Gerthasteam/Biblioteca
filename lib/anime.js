// Datos extra de un anime, guardados en animes.meta:
// {
//   anilistId, format ("TV", "Película"…), seasonYear, duration (min por episodio),
//   studios: ["MAPPA"], genres: ["Acción"],
//   airingStatus,                    "en_emision" | "finalizado" | "pausado" | "cancelado" | "proximamente"
//   scores: { story, animation, sound }, review: "",
//   watchLog: { "2026-11-02": 3 }    episodios vistos por día (para estadísticas)
// }
// El próximo episodio NO se guarda: se pide en vivo a AniList (/api/anime/airing).

export const AIRING_STATUS_LABEL = {
  en_emision: "En emisión",
  finalizado: "Finalizado",
  pausado: "Pausado",
  cancelado: "Cancelado",
  proximamente: "Próximamente"
};
export const ANILIST_AIRING = {
  RELEASING: "en_emision",
  FINISHED: "finalizado",
  HIATUS: "pausado",
  CANCELLED: "cancelado",
  NOT_YET_RELEASED: "proximamente"
};
export const FORMAT_LABEL = { TV: "Serie", TV_SHORT: "Serie corta", MOVIE: "Película", SPECIAL: "Especial", OVA: "OVA", ONA: "ONA", MUSIC: "Musical" };

function str(v, max = 80) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}
function strList(v, maxItems = 12) {
  return Array.isArray(v) ? v.map((s) => str(s, 60)).filter(Boolean).slice(0, maxItems) : [];
}
function score(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 && n <= 5 ? n : 0;
}
function posInt(v, max) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 && n <= max ? n : null;
}

export function cleanAnimeMeta(m) {
  if (!m || typeof m !== "object" || Array.isArray(m)) return null;
  const watchLog = {};
  if (m.watchLog && typeof m.watchLog === "object") {
    for (const [day, n] of Object.entries(m.watchLog)) {
      const c = parseInt(n, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(c) && c > 0 && c < 2000) watchLog[day] = c;
    }
  }
  return {
    anilistId: posInt(m.anilistId, 1e9),
    format: str(m.format, 20),
    seasonYear: posInt(m.seasonYear, 3000),
    duration: posInt(m.duration, 600),
    studios: strList(m.studios, 4),
    genres: strList(m.genres),
    airingStatus: AIRING_STATUS_LABEL[m.airingStatus] ? m.airingStatus : "",
    scores: { story: score(m.scores?.story), animation: score(m.scores?.animation), sound: score(m.scores?.sound) },
    review: str(m.review, 2000),
    watchLog
  };
}

// Minutos vistos de un anime: episodios vistos × duración (24 min si no se sabe).
export function minutesWatched(anime) {
  const d = anime?.meta?.duration || 24;
  return (anime?.current || 0) * d;
}
