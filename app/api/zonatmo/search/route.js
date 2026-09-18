// Busca un manga por título en ZonaTMO (zonatmo.org) y devuelve el link a su
// ficha si encuentra una coincidencia razonable. Server-side por el mismo
// motivo que el resto de /api/*: evita CSP del navegador.
//
// Usa /api/search/suggest?q=<título> — el mismo endpoint JSON que usa la
// app oficial de ZonaTMO para autocompletar la barra de búsqueda. Antes
// intentábamos adivinar el resultado parseando con regex el HTML de
// /biblioteca; probado en vivo contra zonatmo.org, este endpoint devuelve
// JSON directo con {title, url, ...} y es mucho más confiable.
//
// Si algo falla (el sitio no responde, tiene protección anti-bots, cambió su
// API, o no hay ninguna coincidencia razonable) devuelve { url: null } en
// vez de tirar error — del lado del cliente eso simplemente hace que no se
// muestre el botón "Leer en ZonaTMO", nunca rompe nada. El campo "debug" es
// solo para diagnóstico — el cliente no lo usa para nada.
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
    let res;
    try {
      res = await fetch(suggestUrl, {
        headers: { "User-Agent": UA, Accept: "application/json" },
        cache: "no-store"
      });
    } catch (err) {
      return Response.json({ url: null, debug: { step: "fetch", error: String(err?.message || err) } });
    }

    if (!res.ok) {
      const bodyStart = await res.text().catch(() => "");
      return Response.json({
        url: null,
        debug: { step: "status", status: res.status, bodyStart: bodyStart.slice(0, 300) }
      });
    }

    const raw = await res.text();
    let suggestions;
    try {
      suggestions = JSON.parse(raw);
    } catch {
      return Response.json({ url: null, debug: { step: "json_parse", bodyStart: raw.slice(0, 300) } });
    }
    if (!Array.isArray(suggestions)) {
      return Response.json({ url: null, debug: { step: "not_array", bodyStart: raw.slice(0, 300) } });
    }

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

    return Response.json({ url: bestUrl, debug: { step: "ok", count: suggestions.length } });
  } catch (err) {
    return Response.json({ url: null, debug: { step: "exception", error: String(err?.message || err) } });
  }
}
