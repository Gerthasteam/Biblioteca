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

// El listado completo de cartas de One Piece (todas las expansiones, unas
// 3700). Se guarda en memoria 30 minutos mientras la función serverless
// siga "tibia", así no se baja entero en cada pedido. Cada carta lleva
// además su set (setId / setName) para poder sumarla a la carpeta que
// corresponde.
let opAll = null;
let opAllAt = 0;
export async function getOnePieceAll() {
  if (opAll && Date.now() - opAllAt < 30 * 60 * 1000) return opAll;
  const res = await fetch("https://optcgapi.com/api/allSetCards/", { cache: "no-store" });
  if (!res.ok) throw new Error("upstream_error");
  const json = await res.json();
  const seen = new Set();
  const list = [];
  for (const c of Array.isArray(json) ? json : []) {
    const card = { ...onePieceCard(c), setId: c.set_id || null, setName: c.set_name || null };
    // la misma carta puede venir repetida si se reimprimió en otro set: nos
    // quedamos con la primera aparición
    if (seen.has(card.id)) continue;
    seen.add(card.id);
    list.push(card);
  }
  opAll = list;
  opAllAt = Date.now();
  return list;
}

// Todos los precios de One Piece de una sola vez, por clave de carta.
export async function getOnePiecePrices() {
  const prices = {};
  for (const c of await getOnePieceAll()) if (c.price != null) prices[c.id] = c.price;
  return prices;
}

function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Búsqueda para la carga rápida y los mazos: por código ("OP05-119",
// "op05119", "OP05") o por nombre ("luffy", "nami paralela"). Los códigos
// exactos van primero; dentro de cada carta, la normal antes que las
// paralelas.
export async function searchOnePiece(q, limit = 40) {
  const all = await getOnePieceAll();
  const raw = String(q || "").trim().toUpperCase();
  const code = raw.replace(/[^A-Z0-9]/g, "");
  const words = normalize(q).split(" ").filter(Boolean);
  if (!code && !words.length) return [];
  const scored = [];
  for (const c of all) {
    const num = String(c.number || "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
    let score = 0;
    if (code.length >= 3 && num === code) score = 100;
    else if (code.length >= 3 && num.startsWith(code)) score = 60;
    else {
      const hay = normalize(`${c.title} ${c.variant || ""} ${c.setName || ""} ${c.color || ""}`);
      if (words.length && words.every((w) => hay.includes(w))) score = 30;
    }
    if (score) scored.push({ c, score: score - (c.variant ? 1 : 0) });
  }
  return scored
    .sort((a, b) => b.score - a.score || String(a.c.number).localeCompare(String(b.c.number)) || String(a.c.id).localeCompare(String(b.c.id)))
    .slice(0, limit)
    .map((x) => x.c);
}

// Datos por número de carta (para los mazos, que cuentan la carta sin
// importar la versión): la versión normal y el precio más barato entre
// todas sus versiones.
export async function lookupOnePiece(numbers) {
  const want = new Set(numbers.map((n) => String(n).toUpperCase()));
  const out = {};
  for (const c of await getOnePieceAll()) {
    const n = String(c.number || "").toUpperCase();
    if (!want.has(n)) continue;
    const prev = out[n];
    const base = !c.variant;
    if (!prev || (base && prev.variant)) out[n] = { ...c, minPrice: prev?.minPrice ?? null };
    const cur = out[n];
    if (c.price != null && (cur.minPrice == null || c.price < cur.minPrice)) cur.minPrice = c.price;
  }
  return out;
}

// ---- Pokémon (pokemontcg.io) ----

// La API de Pokémon devuelve errores 500/502 seguido aunque la misma
// consulta ande un segundo después: se reintenta hasta 3 veces.
async function pokemonFetch(url) {
  let res;
  for (let i = 0; i < 3; i++) {
    res = await fetch(url, { cache: "no-store" });
    if (res.ok || res.status < 500) return res;
    await new Promise((r) => setTimeout(r, 400 * (i + 1)));
  }
  return res;
}

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
  const res = await pokemonFetch(url);
  if (!res.ok) throw new Error("upstream_error");
  const json = await res.json();
  return sortByNumber((json.data || []).map(pokemonCard));
}

// Búsqueda de Pokémon para la carga rápida y los mazos: por id de carta
// ("sv1-63"), por set + número ("SVI 63", con el código de set del juego
// online) o por nombre ("pikachu ex"). La API es lenta e inestable, así que
// devuelve pocas cartas.
// Código de set del juego online ("SVI") → id del set en la API ("sv1"). La
// API de cartas no deja filtrar por ese código, así que se traduce con la
// lista de sets (guardada 6 horas en memoria).
let pkCodes = null;
let pkCodesAt = 0;
async function pokemonSetIdByCode(code) {
  if (!pkCodes || Date.now() - pkCodesAt > 6 * 3600 * 1000) {
    const res = await pokemonFetch("https://api.pokemontcg.io/v2/sets?pageSize=250");
    if (!res.ok) throw new Error("upstream_error");
    const json = await res.json();
    pkCodes = {};
    for (const s of json.data || []) if (s.ptcgoCode) pkCodes[s.ptcgoCode.toUpperCase()] = s.id;
    pkCodesAt = Date.now();
  }
  return pkCodes[String(code).toUpperCase()] || null;
}

export async function searchPokemon(q, limit = 36) {
  const raw = String(q || "").trim();
  if (raw.length < 2) return [];
  let query;
  const id = /^([a-z0-9]+-[a-z0-9]+)$/i.exec(raw);
  const setNum = /^([a-z0-9]{2,6})\s+(\d+[a-z]?)$/i.exec(raw);
  if (id) query = `id:${id[1].toLowerCase()}`;
  else if (setNum) {
    const setId = await pokemonSetIdByCode(setNum[1]);
    if (!setId) return [];
    query = `id:${setId}-${setNum[2].toLowerCase()}`;
  } else {
    const name = raw.replace(/["\\]/g, "");
    query = `name:"${name}*"`;
  }
  const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(query)}&orderBy=-set.releaseDate&pageSize=${limit}`;
  const res = await pokemonFetch(url);
  if (!res.ok) throw new Error("upstream_error");
  const json = await res.json();
  return (json.data || []).map((c) => ({ ...pokemonCard(c), setId: c.set?.id || null, setName: c.set?.name || null }));
}

// Datos de cartas de Pokémon por id (para mostrar un mazo).
export async function lookupPokemon(ids) {
  const out = {};
  for (let i = 0; i < ids.length; i += 30) {
    const chunk = ids.slice(i, i + 30).map((x) => String(x).toLowerCase().replace(/[^a-z0-9-]/g, "")).filter(Boolean);
    if (!chunk.length) continue;
    const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(chunk.map((x) => `id:${x}`).join(" OR "))}&pageSize=60`;
    const res = await pokemonFetch(url);
    if (!res.ok) throw new Error("upstream_error");
    const json = await res.json();
    for (const c of json.data || []) {
      const card = { ...pokemonCard(c), setId: c.set?.id || null, setName: c.set?.name || null };
      out[card.id.toUpperCase()] = { ...card, number: card.id.toUpperCase(), minPrice: card.price };
    }
  }
  return out;
}

export async function getCards(game, setId) {
  if (game === "onepiece") return getOnePieceCards(setId);
  if (game === "pokemon") return getPokemonCards(setId);
  return [];
}
