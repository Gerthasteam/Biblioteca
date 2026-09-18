// Recomienda un manga de ZonaTMO que la persona todavía NO tenga cargado en
// su colección — a diferencia de /api/zonatmo/search (que busca un título
// puntual con el buscador de la barra), esta ruta trae una tanda de mangas
// populares de la biblioteca de ZonaTMO y elige uno al azar entre los que no
// coinciden con ningún título que ya tengas.
//
// La página /biblioteca arma esa lista con JavaScript después de cargar: el
// primer HTML que manda el servidor viene vacío, y recién se llena cuando el
// navegador pide de nuevo la misma URL pero marcada como pedido AJAX
// (header "X-Requested-With: XMLHttpRequest") — ahí el servidor responde un
// JSON con el HTML de la grilla adentro ({ html: "..." }). Sin ese header no
// hay ningún manga en la respuesta, por eso antes esto siempre daba vacío.
function normalize(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function fetchLibraryHtml(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "application/json, text/html, */*",
      "X-Requested-With": "XMLHttpRequest",
      Referer: "https://zonatmo.org/biblioteca"
    },
    cache: "no-store"
  });
  if (!res.ok) return null;

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const json = await res.json().catch(() => null);
    return typeof json?.html === "string" ? json.html : null;
  }
  // Por las dudas de que el sitio cambie y deje de envolver en JSON, si no
  // vino como JSON lo tratamos directo como HTML.
  return await res.text();
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const ownedTitles = Array.isArray(body.ownedTitles) ? body.ownedTitles : [];
    const owned = new Set(ownedTitles.map(normalize).filter(Boolean));

    // Biblioteca ordenada por popularidad (likes_count) — recomendamos algo
    // conocido, con capítulos de verdad, en vez de un título perdido. Una
    // página al azar entre las primeras 15 (las más populares) le da
    // variedad sin caer en resultados demasiado de nicho.
    const page = 1 + Math.floor(Math.random() * 15);
    const searchUrl =
      `https://zonatmo.org/biblioteca?title=&filter_by=title` +
      `&order_item=likes_count&order_dir=desc&_pg=1&page=${page}`;

    const html = await fetchLibraryHtml(searchUrl);
    if (!html) return Response.json({ manga: null });

    const linkRegex = /href="(\/library\/[^"]+)"/g;
    let match;
    const candidates = [];
    const seen = new Set();

    while ((match = linkRegex.exec(html))) {
      const href = match[1];
      const chunk = html.slice(match.index, match.index + 900);
      const titleMatch = chunk.match(/<h4[^>]*>([^<]+)<\/h4>/);
      if (!titleMatch) continue;
      const title = titleMatch[1].trim();
      const norm = normalize(title);
      if (!norm || seen.has(norm) || owned.has(norm)) continue;
      seen.add(norm);
      candidates.push({ title, url: `https://zonatmo.org${href}` });
    }

    if (!candidates.length) return Response.json({ manga: null });
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    return Response.json({ manga: pick });
  } catch {
    return Response.json({ manga: null });
  }
}
