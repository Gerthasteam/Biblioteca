// Cartas de un set/expansión puntual, para el paso 3 del asistente de carga
// (elegir la carta después de elegir juego y set) y para "Carpeta TCG".
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const game = searchParams.get("game");
  const set = (searchParams.get("set") || "").trim();
  if (!set) return Response.json({ cards: [] });

  if (game === "pokemon") return pokemonCards(set);
  if (game === "onepiece") return onePieceCards(set);
  return Response.json({ cards: [] });
}

// Ordena por el número de carta (el último grupo de dígitos del código —
// para "OP01-077" eso es 77, para "102" es 102) así la carpeta queda en el
// orden oficial del set en vez del orden en que la devuelve la API.
function sortByNumber(cards) {
  return cards.slice().sort((a, b) => {
    const matchesA = String(a.number || "").match(/\d+/g);
    const matchesB = String(b.number || "").match(/\d+/g);
    const numA = matchesA ? parseInt(matchesA[matchesA.length - 1], 10) : Infinity;
    const numB = matchesB ? parseInt(matchesB[matchesB.length - 1], 10) : Infinity;
    if (numA !== numB) return numA - numB;
    return String(a.number || "").localeCompare(String(b.number || ""));
  });
}

async function pokemonCards(setId) {
  try {
    const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(`set.id:${setId}`)}&orderBy=number&pageSize=250`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return Response.json({ cards: [], error: "upstream_error" }, { status: 502 });
    const json = await res.json();
    const cards = (json.data || []).map((c) => ({
      id: c.id,
      title: c.name,
      number: c.number || null,
      rarity: c.rarity || null,
      cover: c.images?.large || c.images?.small || null
    }));
    return Response.json({ cards: sortByNumber(cards) });
  } catch {
    return Response.json({ cards: [], error: "fetch_failed" }, { status: 502 });
  }
}

async function onePieceCards(setId) {
  try {
    const res = await fetch(`https://optcgapi.com/api/sets/${encodeURIComponent(setId)}/`, { cache: "no-store" });
    if (!res.ok) return Response.json({ cards: [], error: "upstream_error" }, { status: 502 });
    const json = await res.json();
    const cards = (Array.isArray(json) ? json : []).map((c) => ({
      id: c.card_set_id,
      title: c.card_name,
      number: c.card_set_id || null,
      rarity: c.rarity || null,
      cover: c.card_image || null
    }));
    return Response.json({ cards: sortByNumber(cards) });
  } catch {
    return Response.json({ cards: [], error: "fetch_failed" }, { status: 502 });
  }
}
