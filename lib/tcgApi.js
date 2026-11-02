// Lectura de cartas desde las APIs públicas de TCG (solo del lado del
// servidor — /api/tcg/cards y /api/tcg/prices). Cada carta sale con el
// mismo formato sea del juego que sea:
// { id, title, number, rarity, color, type, variant, price, cover }
// "id" es la clave única de la carta en su juego (ver lib/tcgCard.js) y
// "price" el precio de mercado en dólares (TCGplayer), o null.
import { ONE_PIECE_VIRTUAL_SETS } from "./onePieceSets";

// Ordena por el número de carta (el último grupo de dígitos del código —
// para "OP01-077" eso es 77, para "102" es 102) así la carpeta queda en el
// orden oficial del set en vez del orden en que la devuelve la API. La
// paralela queda justo después de su versión normal.
export function sortByNumber(cards) {
  return cards.slice().sort((a, b) => {
    const matchesA = String(a.number || "").match(/\d+/g);
    const matchesB = String(b.number || "").match(/\d+/g);
    const numA = matchesA ? parseInt(matchesA[matchesA.length - 1], 10) : Infinity;
    const numB = matchesB ? parseInt(matchesB[matchesB.length - 1], 10) : Infinity;
    if (numA !== numB) return numA - numB;
    return String(a.id || "").localeCompare(String(b.id || ""));
  });
}

// ---- One Piece (optcgapi.com) ----

function onePieceCard(c) {
  const imageId = c.card_image_id || c.card_set_id;
  // Las versiones alternativas tienen el id de imagen con sufijo
  // ("OP01-077_p1") y el nombre ya aclara cuál es: "(Parallel)",
  // "(Box Topper)", etc.
  const isAlt = imageId !== c.card_set_id;
  const label = /\(([^)]+)\)\s*$/.exec(c.card_name || "");
  return {
    id: imageId,
    title: c.card_name,
    number: c.card_set_id || null,
    rarity: c.rarity || null,
    color: c.card_color || null,
    type: c.card_type || null,
    variant: isAlt ? (label ? label[1] : "Paralela") : null,
    price: Number.isFinite(c.market_price) ? c.market_price : null,
    cover: c.card_image || null,
    // para la ventana de detalle de la carta
    details: {
      text: c.card_text || null,
      cost: c.card_cost ?? null,
      power: c.card_power ?? null,
      counter: c.counter_amount ?? null,
      life: c.life ?? null,
      attribute: c.attribute || null,
      subTypes: c.sub_types || null
    }
  };
}

export async function getOnePieceCards(setId) {
  // Set "virtual" (ver lib/onePieceSets.js): se juntan las cartas con su
  // código desde los sets donde vinieron mezcladas.
  const virtual = ONE_PIECE_VIRTUAL_SETS[setId];
  const sources = virtual ? virtual.from : [setId];
  let list = [];
  for (const src of sources) {
    const res = await fetch(`https://optcgapi.com/api/sets/${encodeURIComponent(src)}/`, { cache: "no-store" });
    if (!res.ok) throw new Error("upstream_error");
    const json = await res.json();
    list = list.concat(Array.isArray(json) ? json : []);
  }
  if (virtual) list = list.filter((c) => String(c.card_set_id || "").startsWith(virtual.prefix));
  return sortByNumber(list.map(onePieceCard));
}

// Todos los precios de One Piece de una sola vez (la API tiene un listado
// completo). Se guarda en memoria 30 minutos mientras la función
// serverless siga "tibia", así no se baja el listado entero cada vez.
let opPrices = null;
let opPricesAt = 0;
export async function getOnePiecePrices() {
  if (opPrices && Date.now() - opPricesAt < 30 * 60 * 1000) return opPrices;
  const res = await fetch("https://optcgapi.com/api/allSetCards/", { cache: "no-store" });
  if (!res.ok) throw new Error("upstream_error");
  const json = await res.json();
  const prices = {};
  for (const c of Array.isArray(json) ? json : []) {
    const card = onePieceCard(c);
    if (card.price != null) prices[card.id] = card.price;
  }
  opPrices = prices;
  opPricesAt = Date.now();
  return prices;
}

// ---- Pokémon (pokemontcg.io) ----

const POKEMON_PRICE_KINDS = ["holofoil", "normal", "reverseHolofoil", "1stEditionHolofoil", "unlimitedHolofoil", "1stEditionNormal"];

function pokemonCard(c) {
  const prices = c.tcgplayer?.prices || {};
  const kind = POKEMON_PRICE_KINDS.find((k) => Number.isFinite(prices[k]?.market));
  return {
    id: c.id,
    title: c.name,
    number: c.number || null,
    rarity: c.rarity || null,
    color: (c.types || []).join(" ") || null,
    type: c.supertype || null,
    variant: null,
    price: kind ? prices[kind].market : null,
    cover: c.images?.large || c.images?.small || null,
    details: {
      text:
        [...(c.rules || []), ...(c.abilities || []).map((a) => `${a.name}: ${a.text}`), ...(c.attacks || []).map((a) => `${a.name}${a.damage ? ` (${a.damage})` : ""}${a.text ? `: ${a.text}` : ""}`)]
          .filter(Boolean)
          .join("\n") || null,
      hp: c.hp || null,
      subTypes: (c.subtypes || []).join(" · ") || null,
      artist: c.artist || null
    }
  };
}

export async function getPokemonCards(setId) {
  const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(`set.id:${setId}`)}&orderBy=number&pageSize=250`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("upstream_error");
  const json = await res.json();
  return sortByNumber((json.data || []).map(pokemonCard));
}

export async function getCards(game, setId) {
  if (game === "onepiece") return getOnePieceCards(setId);
  if (game === "pokemon") return getPokemonCards(setId);
  return [];
}
