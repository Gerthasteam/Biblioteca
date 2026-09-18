// Busca un manga por título en ZonaTMO (zonatmo.org) y devuelve el link a su
// ficha si encuentra una coincidencia razonable. Server-side por el mismo
// motivo que el resto de /api/*: evita CSP del navegador. ZonaTMO no tiene
// una API pública, así que se parsea el HTML de su buscador (/biblioteca)
// con una expresión regular simple en vez de sumar una librería nueva al
// proyecto (así no hace falta tocar package-lock.json para este cambio).
//
// Si algo falla (el sitio no responde, tiene protección anti-bots, cambió su
// HTML, o no hay ninguna coincidencia razonable) devuelve { url: null } en
// vez de tirar error — del lado del cliente eso simplemente hace que no se
// muestre el botón "Leer en ZonaTMO", nunca rompe nada.
function normalize(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const title = (searchParams.get("title") || "").trim();
    if (!title) return Response.json({ url: null });

    const searchUrl = `https://zonatmo.org/biblioteca?title=${encodeURIComponent(title)}`;
    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml"
      },
      cache: "no-store"
    });
    if (!res.ok) return Response.json({ url: null });

    const html = await res.text();
    const wanted = normalize(title);
    if (!wanted) return Response.json({ url: null });

    const linkRegex = /href="(\/library\/[^"]+)"/g;
    let match;
    let bestUrl = null;
    while ((match = linkRegex.exec(html))) {
      const href = match[1];
      const chunk = html.slice(match.index, match.index + 900);
      const titleMatch = chunk.match(/<h4[^>]*>([^<]+)<\/h4>/);
      if (!titleMatch) continue;
      const foundNorm = normalize(titleMatch[1]);
      if (!foundNorm) continue;
      if (foundNorm === wanted || foundNorm.includes(wanted) || wanted.includes(foundNorm)) {
        bestUrl = `https://zonatmo.org${href}`;
        break;
      }
    }

    return Response.json({ url: bestUrl });
  } catch {
    return Response.json({ url: null });
  }
}
