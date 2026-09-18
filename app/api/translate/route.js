// Traduce texto corto EN -> ES vía MyMemory (gratis, sin API key). Server-side
// para evitar el CSP del navegador, igual que el resto de /api/search. Se usa
// solo para la sinopsis de manga que trae AniList (viene en inglés): el
// cliente la muestra en inglés al toque y la reemplaza acá apenas llega la
// traducción, o se queda con el inglés si algo falla — nunca rompe el guardado.
export async function POST(req) {
  try {
    const body = await req.json();
    const text = (body.text || "").trim();
    if (!text) return Response.json({ text: null });

    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|es`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return Response.json({ text: null }, { status: 502 });

    const json = await res.json();
    const translated = json?.responseData?.translatedText;
    if (
      !translated ||
      typeof translated !== "string" ||
      /MYMEMORY WARNING|INVALID |QUERY LENGTH LIMIT/i.test(translated)
    ) {
      return Response.json({ text: null });
    }
    return Response.json({ text: translated.slice(0, 250) });
  } catch {
    return Response.json({ text: null, error: "fetch_failed" }, { status: 502 });
  }
}
