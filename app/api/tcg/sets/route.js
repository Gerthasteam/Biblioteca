// Lista de sets/expansiones para el asistente de carga de cartas TCG
// (Pokémon TCG API y OPTCG API, ninguna pide key).
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const game = searchParams.get("game");

  if (game === "pokemon") return pokemonSets();
  if (game === "onepiece") return onePieceSets();
  return Response.json({ sets: [] });
}

async function pokemonSets() {
  try {
    const res = await fetch("https://api.pokemontcg.io/v2/sets?orderBy=-releaseDate&pageSize=250", {
      cache: "no-store"
    });
    if (!res.ok) return Response.json({ sets: [], error: "upstream_error" }, { status: 502 });
    const json = await res.json();
    const sets = (json.data || []).map((s) => ({
      id: s.id,
      name: s.name,
      series: s.series || null,
      releaseDate: s.releaseDate || null,
      total: s.total || s.printedTotal || null,
      logo: s.images?.logo || s.images?.symbol || null
    }));
    return Response.json({ sets });
  } catch {
    return Response.json({ sets: [], error: "fetch_failed" }, { status: 502 });
  }
}

async function onePieceSets() {
  try {
    const res = await fetch("https://optcgapi.com/api/allSets/", { cache: "no-store" });
    if (!res.ok) return Response.json({ sets: [], error: "upstream_error" }, { status: 502 });
    const json = await res.json();
    const sets = (Array.isArray(json) ? json : [])
      .map((s) => ({ id: s.set_id, name: s.set_name, series: null, releaseDate: null, total: null, logo: null }))
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    return Response.json({ sets });
  } catch {
    return Response.json({ sets: [], error: "fetch_failed" }, { status: 502 });
  }
}
