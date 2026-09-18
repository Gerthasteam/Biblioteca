// Busca un manga por título en ZonaTMO (zonatmo.org) y devuelve el link a su
// ficha si encuentra una coincidencia razonable. Server-side por el mismo
// motivo que el resto de /api/*: evita CSP del navegador.
//
// Usa /api/search/suggest?q=<título> — el mismo endpoint JSON que usa la
// app oficial de ZonaTMO para autocompletar la barra de búsqueda. Antes
// intentábamos adivinar el resultado parseando con regex el HTML de
// /biblioteca, pero esa página arma la lista de mangas con JavaScript
// después de cargar (el HTML que devuelve el server no trae nada todavía),
// así que nunca encontraba nada. Este endpoint sí devuelve JSON directo.
//
// Si algo falla (el sitio no responde, tiene protección anti-bots, cambió su
// API, o no hay ninguna coincidencia razonable) devuelve { url: null } en
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

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const title = (searchParams.get("title") || "").trim();
    if (!title) return Response.json({ url: null });

    const wanted = normalize(title);
    if (!wanted) return Response.json({ url: null });

    const suggestUrl = `https://zonatmo.org/api/search/suggest?q=${encodeURIComponent(title)}`;
    const res = await fetch(suggestUrl, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      cache: "no-store"
    });
    if (!res.ok) return Response.json({ url: null });

    const suggestions = await res.json().catch(() => null);
    if (!Array.isArray(suggestions)) return Response.json({ url: null });

    let bestUrl = null;
    for (const s of suggestions) {
      const foundNorm = normalize(s?.title || "");
      const rawUrl = s?.url || "";
      if (!foundNorm || !rawUrl || !rawUrl.includes("/library/")) continue;
      if (foundNorm === wanted || foundNorm.includes(wanted) || wanted.includes(foundNorm)) {
        bestUrl = rawUrl.startsWith("http") ? rawUrl : `https://zonatmo.org${rawUrl}`;
        break;
      }
    }

    return Response.json({ url: bestUrl });
  } catch {
    return Response.json({ url: null });
  }
}
