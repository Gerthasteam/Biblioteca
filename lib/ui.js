export const CATEGORY_LABEL = { manga: "Manga", tcg: "TCG", videojuego: "Videojuego", otro: "Otro" };
export const CATEGORY_UNIT = { manga: "Capítulo", tcg: "Carta", videojuego: "Hora", otro: "Progreso" };
export const ITEM_STATUS_LABEL = { pendiente: "Pendiente", progreso: "En progreso", completo: "Completo" };
export const ANIME_STATUS_LABEL = { pendiente: "Pendiente", viendo: "Viendo", completo: "Completo" };

const SPINE_PALETTE = ["#7A2E2E","#2E4F3E","#25415C","#8A5A22","#4A3B63","#33313A","#6E2F55","#1F5C57","#7D3B18","#3D3D6B"];

export function hashString(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
  return h;
}

export function spineWidth(it) {
  if (it.total) {
    const t = Math.max(1, parseInt(it.total, 10) || 1);
    return Math.max(20, Math.min(60, Math.round(16 + t * 1.1)));
  }
  return 22 + (hashString((it.title || "x") + "|w") % 15);
}

export function spineBackground(it) {
  if (it.coverUrl) {
    return `linear-gradient(rgba(0,0,0,.15), rgba(0,0,0,.5)), url('${it.coverUrl.replace(/'/g, "%27")}')`;
  }
  return SPINE_PALETTE[hashString(it.title || "x") % SPINE_PALETTE.length];
}

export function spineHeadband(status) {
  if (status === "completo") return "var(--gold)";
  if (status === "progreso" || status === "viendo") return "var(--accent)";
  return "var(--ink-muted)";
}

export function stars(n, max = 5) {
  let out = "";
  for (let i = 1; i <= max; i++) out += i <= n ? "★" : "☆";
  return out;
}

export function statusColorVars(st) {
  if (st === "completo") return { bg: "var(--status-done-bg)", fg: "var(--status-done-fg)" };
  if (st === "progreso" || st === "viendo") return { bg: "var(--status-progress-bg)", fg: "var(--status-progress-fg)" };
  return { bg: "var(--status-pending-bg)", fg: "var(--status-pending-fg)" };
}

export function statusDotColor(st) {
  if (st === "completo") return "var(--accent)";
  if (st === "progreso" || st === "viendo") return "var(--secondary)";
  return "var(--text-faint)";
}

export function statusText(st, kind) {
  const label =
    kind === "anime" ? ANIME_STATUS_LABEL[st] : ITEM_STATUS_LABEL[st];
  return label || st;
}

// Solid cover placeholder (no image yet) for poster-style grid cards.
export function posterBackground(it) {
  if (it.coverUrl) return `url('${it.coverUrl.replace(/'/g, "%27")}')`;
  const c = SPINE_PALETTE[hashString(it.title || "x") % SPINE_PALETTE.length];
  return `linear-gradient(160deg, ${c}, color-mix(in srgb, ${c} 55%, #000))`;
}

export function progressPct(current, total) {
  if (!total || total <= 0) return null;
  return Math.max(0, Math.min(100, Math.round(((current || 0) / total) * 100)));
}

export function progressLabel(current, total, unit) {
  const c = current || 0;
  if (total != null) return `${unit} ${c} / ${total}`;
  return `${unit} ${c}`;
}
