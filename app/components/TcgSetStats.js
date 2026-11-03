"use client";

import { useMemo } from "react";
import { tcgCardKey, tcgQuantity, rarityRank, formatUsd, SHOW_PRICES } from "../../lib/tcgCard";

// "Estadísticas" de una carpeta TCG (como el Set Analytics de Collectr):
// cuánto completaste por rareza y en paralelas, y las cartas más caras que
// tenés y que te faltan. Tocar una carta abre su detalle.
export default function TcgSetStats({ items, info, prices, onOpen }) {
  const rows = useMemo(
    () =>
      items.map((it) => {
        const key = tcgCardKey(it);
        const card = (info && info[key]) || {};
        return { it, card, price: prices?.[key] ?? card.price ?? null, qty: tcgQuantity(it) };
      }),
    [items, info, prices]
  );

  const byRarity = useMemo(() => {
    const m = new Map();
    for (const r of rows) {
      const k = r.card.rarity || "Sin rareza";
      if (!m.has(k)) m.set(k, { rarity: k, owned: 0, total: 0 });
      const e = m.get(k);
      e.total += 1;
      if (r.qty > 0) e.owned += 1;
    }
    return [...m.values()].sort((a, b) => rarityRank(a.rarity) - rarityRank(b.rarity) || a.rarity.localeCompare(b.rarity));
  }, [rows]);

  const variants = rows.filter((r) => r.card.variant);
  const ownedVariants = variants.filter((r) => r.qty > 0).length;
  const priced = rows.filter((r) => r.price != null);
  const topOwned = priced.filter((r) => r.qty > 0).sort((a, b) => b.price - a.price).slice(0, 5);
  const topMissing = priced.filter((r) => r.qty === 0).sort((a, b) => b.price - a.price).slice(0, 5);
  const copies = rows.reduce((n, r) => n + r.qty, 0);
  const hasInfo = rows.some((r) => r.card.rarity);

  return (
    <div className="tcg-stats">
      <section className="tcg-stats__box">
        <h3>Completado por rareza</h3>
        {!hasInfo && <p className="section-header__sub">Esta carpeta no tiene datos de rareza (carpeta armada a mano o la API no respondió).</p>}
        {hasInfo &&
          byRarity.map((r) => {
            const pct = r.total ? Math.round((r.owned / r.total) * 100) : 0;
            return (
              <div key={r.rarity} className="tcg-stats__bar-row">
                <span className="tcg-stats__label">{r.rarity}</span>
                <span className="tcg-stats__bar">
                  <span className="tcg-stats__bar-fill" style={{ width: pct + "%" }} />
                </span>
                <span className="tcg-stats__num">
                  {r.owned}/{r.total}
                </span>
              </div>
            );
          })}
        {variants.length > 0 && (
          <div className="tcg-stats__bar-row tcg-stats__bar-row--variant">
            <span className="tcg-stats__label">Paralelas</span>
            <span className="tcg-stats__bar">
              <span className="tcg-stats__bar-fill" style={{ width: Math.round((ownedVariants / variants.length) * 100) + "%" }} />
            </span>
            <span className="tcg-stats__num">
              {ownedVariants}/{variants.length}
            </span>
          </div>
        )}
        <p className="section-header__sub" style={{ marginTop: 10 }}>
          {copies} copia{copies === 1 ? "" : "s"} en total
        </p>
      </section>

      {SHOW_PRICES && <TopList title="Tus cartas más caras" rows={topOwned} empty="Todavía no tenés cartas con precio en esta carpeta." onOpen={onOpen} />}
      {SHOW_PRICES && <TopList title="Las más caras que te faltan" rows={topMissing} empty="¡No te falta ninguna con precio!" onOpen={onOpen} />}
    </div>
  );
}

function TopList({ title, rows, empty, onOpen }) {
  return (
    <section className="tcg-stats__box">
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <p className="section-header__sub">{empty}</p>
      ) : (
        <ol className="tcg-stats__top">
          {rows.map((r) => (
            <li key={r.it.id}>
              <button type="button" onClick={() => onOpen(r.it.id)}>
                <span
                  className="tcg-stats__thumb"
                  style={{ backgroundImage: r.it.coverUrl ? `url('${r.it.coverUrl.replace(/'/g, "%27")}')` : undefined }}
                />
                <span className="tcg-stats__top-name">
                  {r.it.title}
                  <small>{[r.card.number, r.card.rarity].filter(Boolean).join(" · ")}</small>
                </span>
                <b>{formatUsd(r.price)}</b>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
