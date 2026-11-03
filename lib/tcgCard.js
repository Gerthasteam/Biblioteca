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

// ---- Precios: apagados ----
// Los precios de mercado se sacaron de la app (2026-11-03): algunas cartas
// los traen y otras no, y eso generaba valores y totales engañosos. Todo lo
// relacionado (valor de la colección, precio por carta, historial, compras
// y ganancia, pesos/dólar, costo de los mazos) queda en el código pero oculto
// y sin pedir datos. Para volver a mostrarlo, cambiar a true.
export const SHOW_PRICES = false;

// ---- Moneda ----
// Los precios siempre se guardan y calculan en dólares; esto solo decide
// cómo se muestran. La página fija el modo en cada render (setMoney) antes
// de dibujar, así todos los componentes formatean igual sin tener que
// pasarles la cotización a cada uno.
export const MONEY_MODES = [
  { key: "usd", label: "Dólares (US$)" },
  { key: "blue", label: "Pesos · dólar blue" },
  { key: "tarjeta", label: "Pesos · dólar tarjeta" },
  { key: "oficial", label: "Pesos · dólar oficial" },
  { key: "bolsa", label: "Pesos · dólar MEP" }
];
let MONEY = { mode: "usd", rate: null };
export function setMoney(mode, rate) {
  MONEY = mode !== "usd" && Number.isFinite(rate) && rate > 0 ? { mode, rate } : { mode: "usd", rate: null };
}
export function moneyInPesos() {
  return MONEY.mode !== "usd";
}
// De la moneda que se está mostrando a dólares (para guardar lo que el
// usuario carga, por ejemplo cuánto pagó).
export function toUsd(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return null;
  return MONEY.mode !== "usd" ? n / MONEY.rate : n;
}
export function fromUsd(usd) {
  if (usd == null || !Number.isFinite(usd)) return null;
  return MONEY.mode !== "usd" ? usd * MONEY.rate : usd;
}

export function formatUsd(n) {
  if (n == null || !Number.isFinite(n)) return "—";
  if (MONEY.mode !== "usd") {
    const ars = n * MONEY.rate;
    return "$ " + ars.toLocaleString("es-AR", { maximumFractionDigits: ars < 100 ? 2 : 0 });
  }
  return "US$ " + n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Valor de lo que tenés y de lo que falta en una lista de cartas, con los
// precios por clave. Las cartas sin precio no suman. "invested" es lo que
// anotaste que pagaste por las cartas sueltas (costo por copia × copias), y
// "investedValue" lo que valen hoy esas mismas cartas, para comparar.
export function tcgValue(items, prices) {
  let owned = 0;
  let missing = 0;
  let invested = 0;
  let investedValue = 0;
  for (const it of items) {
    const p = prices?.[tcgCardKey(it)];
    const q = tcgQuantity(it);
    if (q > 0 && it.cost != null) {
      invested += it.cost * q;
      if (p != null) investedValue += p * q;
    }
    if (p == null) continue;
    if (q > 0) owned += p * q;
    else missing += p;
  }
  return { owned, missing, invested, investedValue };
}
