import { tcgCardKey } from "./tcgRef";

export { tcgCardKey };

// Copias que tenés de una carta: "current" guarda la cantidad; las cartas
// marcadas como que las tenés antes de que existiera la cantidad cuentan 1.
export function tcgQuantity(item) {
  if (item.status !== "completo") return 0;
  return Math.max(1, item.current || 0);
}

// Orden de rarezas de mayor a menor (One Piece). Las que no estén acá
// (Pokémon tiene muchas otras) van al final por orden alfabético.
const RARITY_ORDER = ["SEC", "SP", "TR", "L", "SR", "R", "UC", "C", "P", "DON"];
export function rarityRank(r) {
  const i = RARITY_ORDER.indexOf((r || "").toUpperCase());
  return i === -1 ? RARITY_ORDER.length : i;
}

export function formatUsd(n) {
  if (n == null || !Number.isFinite(n)) return "—";
  return "US$ " + n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Valor de lo que tenés y de lo que falta en una lista de cartas, con los
// precios por clave. Las cartas sin precio no suman.
export function tcgValue(items, prices) {
  let owned = 0;
  let missing = 0;
  for (const it of items) {
    const p = prices?.[tcgCardKey(it)];
    if (p == null) continue;
    const q = tcgQuantity(it);
    if (q > 0) owned += p * q;
    else missing += p;
  }
  return { owned, missing };
}
