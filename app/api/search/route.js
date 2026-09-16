// Server-side proxy a AniList (manga/anime), RAWG + Steam (videojuegos) y
// Pokémon TCG / One Piece TCG (TCG). Un servidor real no tiene el CSP del
// navegador, así que puede llamar a cualquier host — justo el paso que no
// era posible desde un Artifact.

const ANILIST_QUERY = `
query ($search: String, $type: MediaType) {
  Page(perPage: 6) {
    media(search: $search, type: $type, sort: SEARCH_MATCH) {
      id
      title { romaji english }
      coverImage { large }
      startDate { year }
      chapters
      volumes
      episodes
      description(asHtml: false)
    }
  }
}`;

// La sinopsis de AniList viene larga (y a veces con alguna etiqueta suelta
// tipo <br>/<i> aunque pidamos texto plano) — la limpiamos y recortamos a
// ~250 caracteres, cortando en un espacio para no partir una palabra.
function shortDescription(raw) {
  if (!raw) return null;
  const text = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return null;
  const LIMIT = 250;
  if (text.length <= LIMIT) return text;
  const cut = text.slice(0, LIMIT);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > LIMIT * 0.6 ? cut.slice(0, lastSpace) : cut).trim() + "…";
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const type = searchParams.get("type") || "manga";

  if (!q) return Response.json({ results: [] });

  if (type === "videojuego") return searchVideojuegos(q);
  if (type === "tcg") return searchTcg(q);
  return searchAniList(q, type === "anime" ? "ANIME" : "MANGA");
}

async function searchAniList(q, type) {
  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: ANILIST_QUERY, variables: { search: q, type } }),
      cache: "no-store"
    });
    if (!res.ok) {
      return Response.json({ results: [], error: "upstream_error" }, { status: 502 });
    }
    const json = await res.json();
    const media = json?.data?.Page?.media || [];
    const results = media.map((m) => ({
      title: m.title.english || m.title.romaji,
      cover: m.coverImage?.large || null,
      year: m.startDate?.year || null,
      total: type === "ANIME" ? m.episodes || null : m.volumes || m.chapters || null,
      description: shortDescription(m.description)
    }));
    return Response.json({ results });
  } catch {
    return Response.json({ results: [], error: "fetch_failed" }, { status: 502 });
  }
}

// TCG: buscamos en paralelo en Pokémon TCG (pokemontcg.io, sin key) y
// One Piece Card Game (optcgapi.com, sin key) y mezclamos los resultados.
async function searchTcg(q) {
  const [pokemon, onePiece] = await Promise.all([searchPokemonTcg(q), searchOnePieceTcg(q)]);
  return Response.json({ results: [...pokemon, ...onePiece] });
}

async function searchPokemonTcg(q) {
  try {
    const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(`name:"${q}*"`)}&pageSize=4`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data || []).map((c) => ({
      title: c.set?.name ? `${c.name} (${c.set.name})` : c.name,
      cover: c.images?.large || c.images?.small || null,
      year: null,
      total: null,
      source: "Pokémon TCG"
    }));
  } catch {
    return [];
  }
}

// La API de One Piece no tiene un endpoint de búsqueda por nombre, así que
// traemos el listado completo (se cachea en memoria por 10 minutos mientras
// la función serverless siga "tibia") y filtramos acá.
let opCache = null;
let opCacheAt = 0;
async function fetchOnePieceCards() {
  const now = Date.now();
  if (opCache && now - opCacheAt < 10 * 60 * 1000) return opCache;
  const res = await fetch("https://optcgapi.com/api/allSetCards/", { cache: "no-store" });
  if (!res.ok) throw new Error("optcg upstream error");
  const json = await res.json();
  opCache = Array.isArray(json) ? json : [];
  opCacheAt = now;
  return opCache;
}

async function searchOnePieceTcg(q) {
  try {
    const all = await fetchOnePieceCards();
    const needle = q.toLowerCase();
    return all
      .filter((c) => (c.card_name || "").toLowerCase().includes(needle))
      .slice(0, 4)
      .map((c) => ({
        title: c.set_name ? `${c.card_name} (${c.set_name})` : c.card_name,
        cover: c.card_image || null,
        year: null,
        total: null,
        source: "One Piece TCG"
      }));
  } catch {
    return [];
  }
}

// Videojuegos: RAWG (todas las plataformas, pide API key gratuita —
// RAWG_API_KEY en Vercel) como fuente principal, complementada con la
// búsqueda de la tienda de Steam (sin key, pero solo PC). Se pisan
// duplicados por título así no sale la misma portada dos veces.
async function searchVideojuegos(q) {
  const [rawg, steam] = await Promise.all([searchRAWG(q), searchSteam(q)]);
  const seen = new Set(rawg.map((r) => r.title.toLowerCase().trim()));
  const merged = [...rawg, ...steam.filter((s) => !seen.has(s.title.toLowerCase().trim()))];
  return Response.json({ results: merged });
}

async function searchRAWG(q) {
  const key = process.env.RAWG_API_KEY;
  if (!key) return [];
  try {
    const url = `https://api.rawg.io/api/games?key=${encodeURIComponent(key)}&search=${encodeURIComponent(q)}&page_size=6`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.results || []).map((g) => ({
      title: g.name,
      cover: g.background_image || null,
      year: g.released ? g.released.slice(0, 4) : null,
      total: null,
      source: "RAWG"
    }));
  } catch {
    return [];
  }
}

// Buscador no oficial pero público y estable de la tienda de Steam — sin
// key, sin cuenta. La portada la armamos con el patrón fijo del CDN de
// Steam a partir del appid (mejor calidad que la miniatura que trae la
// búsqueda). Solo cubre juegos de PC/Steam, por eso complementa a RAWG en
// vez de reemplazarlo.
async function searchSteam(q) {
  try {
    const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(q)}&l=english&cc=US`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.items || [])
      .filter((it) => it.type === "app")
      .slice(0, 6)
      .map((it) => ({
        title: it.name,
        cover: `https://cdn.akamai.steamstatic.com/steam/apps/${it.id}/header.jpg`,
        year: null,
        total: null,
        source: "Steam"
      }));
  } catch {
    return [];
  }
}
