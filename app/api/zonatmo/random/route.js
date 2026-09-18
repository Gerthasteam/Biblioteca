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
// JSON con el HTML de la grilla adentro ({ html: "..." }). Confirmado
// probando en vivo contra zonatmo.org: los links vienen como URL absoluta
// (https://zonatmo.org/library/...), no como ruta relativa — el regex tiene
// que aceptar las dos formas. También se excluyen los títulos marcados
// "+18" (contenido para adultos), que en la biblioteca de ZonaTMO son una
// parte grande del catálogo y no algo que esta app deba recomendar.
function normalize(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Los títulos vienen del HTML de ZonaTMO con entidades sin decodificar
// (ej: "Smyrna &amp; Capri") — las pasamos a texto normal antes de mostrarlas.
function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Devuelve { html, debug } en vez de tirar cualquier cosa a la basura — así
// si ZonaTMO bloquea o cambia algo, la respuesta de la ruta trae pistas de
// qué pasó (status, content-type) en vez de solo "no encontramos nada".
// Estos campos "debug" no afectan a la app: el cliente solo lee "manga".
async function fetchLibraryHtml(url) {
  let res;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "application/json, text/html, */*",
        "X-Requested-With": "XMLHttpRequest",
        Referer: "https://zonatmo.org/biblioteca"
      },
      cache: "no-store"
    });
  } catch (err) {
    return { html: null, debug: { step: "fetch", error: String(err?.message || err) } };
  }

  const contentType = res.headers.get("content-type") || "";
  if (!res.ok) {
    const bodyStart = await res.text().catch(() => "");
    return {
      html: null,
      debug: { step: "status", status: res.status, contentType, bodyStart: bodyStart.slice(0, 300) }
    };
  }

  if (contentType.includes("application/json")) {
    const raw = await res.text();
    let json;
    try {
      json = JSON.parse(raw);
    } catch {
      return { html: null, debug: { step: "json_parse", contentType, bodyStart: raw.slice(0, 300) } };
    }
    if (typeof json?.html !== "string") {
      return { html: null, debug: { step: "no_html_field", contentType, keys: Object.keys(json || {}) } };
    }
    return { html: json.html, debug: { step: "ok_json" } };
  }
  // Por las dudas de que el sitio cambie y deje de envolver en JSON, si no
  // vino como JSON lo tratamos directo como HTML.
  const text = await res.text();
  return { html: text, debug: { step: "ok_text", contentType, bodyStart: text.slice(0, 300) } };
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

    const { html, debug } = await fetchLibraryHtml(searchUrl);
    if (!html) return Response.json({ manga: null, debug });

    // El href puede venir absoluto (https://zonatmo.org/library/...) o
    // relativo (/library/...) — aceptamos las dos formas.
    const linkRegex = /href="([^"]*\/library\/[^"]+)"/g;
    let match;
    const candidates = [];
    const seen = new Set();

    while ((match = linkRegex.exec(html))) {
      const rawHref = match[1];
      const chunk = html.slice(match.index, match.index + 1100);

      // Nos saltamos cualquier título marcado como contenido para adultos.
      if (chunk.includes("book-meta-mature")) continue;

      const titleMatch = chunk.match(/<h4[^>]*>([^<]+)<\/h4>/);
      if (!titleMatch) continue;
      const title = decodeEntities(titleMatch[1].trim());
      const norm = normalize(title);
      if (!norm || seen.has(norm) || owned.has(norm)) continue;
      seen.add(norm);

      const url = rawHref.startsWith("http") ? rawHref : `https://zonatmo.org${rawHref}`;
      candidates.push({ title, url });
    }

    if (!candidates.length) {
      return Response.json({ manga: null, debug: { step: "no_candidates", page, htmlLength: html.length } });
    }
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    return Response.json({ manga: pick });
  } catch (err) {
    return Response.json({ manga: null, debug: { step: "exception", error: String(err?.message || err) } });
  }
}
