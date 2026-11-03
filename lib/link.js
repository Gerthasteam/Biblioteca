// Une el manga y el anime de la misma obra comparando títulos normalizados
// (sin tildes, mayúsculas ni signos). Coinciden si son iguales o si uno
// contiene al otro ("Chainsaw Man" ↔ "Chainsaw Man 2nd Season"), con un
// mínimo de largo para no unir títulos cortos por casualidad.
export function normTitle(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(season|temporada|part|parte|the animation|2nd|3rd|\d+(st|nd|rd|th))\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sameWork(a, b) {
  const x = normTitle(a);
  const y = normTitle(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  return short.length >= 5 && (long.startsWith(short + " ") || long === short);
}

export function findAnimeFor(manga, animes) {
  return animes.filter((a) => sameWork(manga.title, a.title));
}

export function findMangaFor(anime, items) {
  return items.filter((it) => it.category === "manga" && sameWork(anime.title, it.title));
}
