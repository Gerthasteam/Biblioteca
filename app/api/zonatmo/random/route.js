// Recomienda un manga de ZonaTMO que la persona todavía NO tenga cargado en
// su colección — a diferencia de /api/zonatmo/search (que busca un título
// puntual), esta ruta trae una tanda de mangas populares de la biblioteca de
// ZonaTMO y elige uno al azar entre los que no coinciden con ningún título
// que ya tengas.
//
// Igual que /api/zonatmo/search: no hay API pública, así que se parsea el
// HTML de /biblioteca con una expresión regular simple (nada de librerías
// nuevas). Si el sitio no responde, tiene protección anti-bots, o no
// encuentra ningún candidato nuevo, devuelve { manga: null } — del lado del
// cliente eso se traduce en un mensaje ("no se pudo conseguir una
// recomendación ahora"), nunca en un error feo.
function normalize(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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

    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml"
      },
      cache: "no-store"
    });
    if (!res.ok) return Response.json({ manga: null });

    const html = await res.text();
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
