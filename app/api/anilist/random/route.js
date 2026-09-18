// Recomienda un manga que la persona todavía NO tenga cargado en su
// colección, usando AniList — la misma API que ya usa el buscador de
// portadas (/api/search), probada y funcionando en producción. Se cambió
// acá porque la biblioteca de ZonaTMO (usada antes para esto) parece estar
// bloqueando los pedidos que salen desde los servidores de Vercel: andaba
// perfecto probándolo desde un navegador normal, pero siempre volvía vacío
// una vez desplegado. AniList es una API pública pensada para consumirse
// así, sin ese problema.
const ANILIST_QUERY = `
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(type: MANGA, sort: POPULARITY_DESC, isAdult: false) {
      title { romaji english }
      coverImage { large }
      siteUrl
      description(asHtml: false)
      startDate { year }
      chapters
      volumes
    }
  }
}`;

function normalize(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function shortDescription(raw) {
  if (!raw) return null;
  const text = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return null;
  const LIMIT = 220;
  if (text.length <= LIMIT) return text;
  const cut = text.slice(0, LIMIT);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > LIMIT * 0.6 ? cut.slice(0, lastSpace) : cut).trim() + "…";
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const ownedTitles = Array.isArray(body.ownedTitles) ? body.ownedTitles : [];
    const owned = new Set(ownedTitles.map(normalize).filter(Boolean));

    // Página al azar entre las primeras 10 tandas de 30 (los ~300 mangas
    // más populares de AniList) — así recomendamos algo conocido, con buena
    // chance de estar traducido, en vez de un título de nicho perdido.
    const page = 1 + Math.floor(Math.random() * 10);
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: ANILIST_QUERY, variables: { page, perPage: 30 } }),
      cache: "no-store"
    });
    if (!res.ok) return Response.json({ manga: null });

    const json = await res.json();
    const media = json?.data?.Page?.media || [];

    const candidates = media
      .map((m) => {
        const title = m.title?.english || m.title?.romaji;
        if (!title) return null;
        return {
          title,
          norm: normalize(title),
          cover: m.coverImage?.large || null,
          url: m.siteUrl || null,
          description: shortDescription(m.description),
          year: m.startDate?.year || null,
          total: m.volumes || m.chapters || null
        };
      })
      .filter((m) => m && m.norm && !owned.has(m.norm));

    if (!candidates.length) return Response.json({ manga: null });
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    delete pick.norm;
    return Response.json({ manga: pick });
  } catch {
    return Response.json({ manga: null });
  }
}
