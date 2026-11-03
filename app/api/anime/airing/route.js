// Próximo episodio de cada anime en emisión, en vivo desde AniList (por id
// de AniList): ?ids=21,113415 → { airing: { "21": { episode, airingAt, status, episodes } } }.
// airingAt viene en segundos (epoch). Se usa para el calendario de emisión y
// la ficha de cada anime.
const QUERY = `
query ($ids: [Int]) {
  Page(perPage: 50) {
    media(id_in: $ids, type: ANIME) {
      id
      status
      episodes
      nextAiringEpisode { episode airingAt }
    }
  }
}`;

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const ids = (searchParams.get("ids") || "")
    .split(",")
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isFinite(n) && n > 0)
    .slice(0, 50);
  if (!ids.length) return Response.json({ airing: {} });
  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: QUERY, variables: { ids } }),
      cache: "no-store"
    });
    if (!res.ok) return Response.json({ airing: {}, error: "upstream_error" }, { status: 502 });
    const json = await res.json();
    const airing = {};
    for (const m of json?.data?.Page?.media || []) {
      airing[m.id] = {
        status: m.status,
        episodes: m.episodes || null,
        episode: m.nextAiringEpisode?.episode || null,
        airingAt: m.nextAiringEpisode?.airingAt || null
      };
    }
    return Response.json({ airing });
  } catch {
    return Response.json({ airing: {}, error: "fetch_failed" }, { status: 502 });
  }
}
