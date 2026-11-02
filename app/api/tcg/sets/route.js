// Lista de sets/expansiones para el asistente de carga de cartas TCG
// (Pokémon TCG API y OPTCG API, ninguna pide key).
import { onePieceSetExtra, ONE_PIECE_VIRTUAL_SETS } from "../../../../lib/onePieceSets";

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
    const fromApi = (Array.isArray(json) ? json : []).map((s) => ({ id: s.set_id, name: s.set_name }));
    // Sets armados juntando cartas de otros (Egghead Crisis), si la API
    // todavía no los tiene como set propio.
    const virtual = Object.entries(ONE_PIECE_VIRTUAL_SETS)
      .filter(([id]) => !fromApi.some((s) => s.id === id))
      .map(([id, v]) => ({ id, name: v.name }));
    const sets = [...fromApi, ...virtual]
      .map((s) => ({ ...s, series: null, total: null, ...onePieceSetExtra(s.id) }))
      // Más nuevo primero (como en la lista oficial); los que no tienen
      // fecha cargada todavía van al principio por las dudas sean nuevos.
      .sort((a, b) => (b.releaseDate || "9999").localeCompare(a.releaseDate || "9999"));
    return Response.json({ sets });
  } catch {
    return Response.json({ sets: [], error: "fetch_failed" }, { status: 502 });
  }
}
