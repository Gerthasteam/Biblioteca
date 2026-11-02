"use client";

import { useMemo, useRef, useState } from "react";
import { Star, TrendingUp, TrendingDown } from "lucide-react";
import { formatUsd, MONEY_MODES } from "../../lib/tcgCard";

const RANGES = [
  { key: 30, label: "30 días" },
  { key: 90, label: "90 días" },
  { key: 365, label: "1 año" }
];

function addDays(day, n) {
  const d = new Date(day + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function shortDate(day) {
  const d = new Date(day + "T12:00:00");
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" }).replace(".", "");
}

// Arma la serie diaria del valor total: por cada juego se usa el último
// valor conocido hasta ese día (los días que no entraste no tienen dato
// propio), y hoy se pisa con el valor en vivo.
function buildSeries(history, live, today) {
  const byGame = new Map();
  for (const h of history) {
    if (!byGame.has(h.game)) byGame.set(h.game, new Map());
    byGame.get(h.game).set(h.day, h.value);
  }
  for (const [game, v] of Object.entries(live)) {
    if (!byGame.has(game)) byGame.set(game, new Map());
    byGame.get(game).set(today, v);
  }
  const days = [...new Set([...history.map((h) => h.day), ...(Object.keys(live).length ? [today] : [])])].sort();
  if (!days.length) return [];
  const series = [];
  const last = new Map();
  for (let day = days[0]; day <= today; day = addDays(day, 1)) {
    let total = 0;
    for (const [game, m] of byGame) {
      if (m.has(day)) last.set(game, m.get(day));
      total += last.get(game) || 0;
    }
    series.push({ day, value: total });
  }
  return series;
}

// Panel de arriba de la sección TCG: cuánto vale hoy tu colección, cuánto
// cambió, un gráfico con la evolución (desde que se empezó a guardar) y el
// acceso a la lista de deseos.
export default function TcgValuePanel({
  history,
  live,
  wishCount,
  wishTotal,
  onOpenWishlist,
  moneyMode,
  onMoneyMode,
  rates,
  invested,
  onOpenPurchases
}) {
  const [range, setRange] = useState(30);
  const [hover, setHover] = useState(null); // índice del punto bajo el mouse/dedo
  const svgRef = useRef(null);
  const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD en hora local

  const all = useMemo(() => buildSeries(history, live, today), [history, live, today]);
  const series = all.slice(-range);
  const now = all.length ? all[all.length - 1].value : Object.values(live).reduce((a, b) => a + b, 0);
  const ref7 = all.length > 7 ? all[all.length - 8].value : all.length ? all[0].value : null;
  const delta = ref7 != null ? now - ref7 : null;
  const deltaPct = ref7 ? (delta / ref7) * 100 : null;

  // geometría del gráfico (viewBox fijo, se estira al ancho)
  const W = 600;
  const H = 120;
  const PAD = 6;
  const max = Math.max(...series.map((p) => p.value), 1);
  const min = Math.min(...series.map((p) => p.value), max);
  const lo = min === max ? 0 : min - (max - min) * 0.15;
  const x = (i) => (series.length <= 1 ? W / 2 : PAD + (i * (W - PAD * 2)) / (series.length - 1));
  const y = (v) => H - PAD - ((v - lo) / (max - lo || 1)) * (H - PAD * 2);
  const line = series.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = series.length > 1 ? `${line} L${x(series.length - 1)},${H} L${x(0)},${H} Z` : "";

  function onMove(e) {
    const svg = svgRef.current;
    if (!svg || series.length < 2) return;
    const r = svg.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - PAD) / (W - PAD * 2)) * (series.length - 1));
    setHover(Math.max(0, Math.min(series.length - 1, i)));
  }

  const hp = hover != null ? series[hover] : null;
  const up = (delta || 0) >= 0;

  return (
    <section className="tcg-value">
      <div className="tcg-value__head">
        <div>
          <div className="tcg-value__label">Valor de tu colección TCG</div>
          <div className="tcg-value__hero">{formatUsd(now)}</div>
          {delta != null && all.length > 1 ? (
            <div className={"tcg-value__delta " + (up ? "tcg-value__delta--up" : "tcg-value__delta--down")}>
              {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {up ? "+" : "−"}
              {formatUsd(Math.abs(delta))}
              {deltaPct != null && ` (${up ? "+" : "−"}${Math.abs(deltaPct).toLocaleString("es-AR", { maximumFractionDigits: 1 })} %)`}
              <span> en {Math.min(7, all.length - 1)} día{Math.min(7, all.length - 1) === 1 ? "" : "s"}</span>
            </div>
          ) : (
            <div className="tcg-value__hint">El gráfico se va armando día a día desde hoy, cada vez que entrás.</div>
          )}
          {invested > 0 && (
            <div className="tcg-value__pl">
              Invertiste <b>{formatUsd(invested)}</b> ·{" "}
              <span className={now - invested >= 0 ? "tcg-value__delta--up" : "tcg-value__delta--down"}>
                {now - invested >= 0 ? "ganancia" : "pérdida"} {now - invested >= 0 ? "+" : "−"}
                {formatUsd(Math.abs(now - invested))} ({now - invested >= 0 ? "+" : "−"}
                {Math.abs(((now - invested) / invested) * 100).toLocaleString("es-AR", { maximumFractionDigits: 1 })} %)
              </span>
            </div>
          )}
          <div className="tcg-value__money">
            <select value={moneyMode} onChange={(e) => onMoneyMode(e.target.value)} aria-label="Moneda">
              {MONEY_MODES.map((m) => (
                <option key={m.key} value={m.key} disabled={m.key !== "usd" && !rates?.[m.key]}>
                  {m.label}
                  {m.key !== "usd" && rates?.[m.key] ? ` ($${Math.round(rates[m.key]).toLocaleString("es-AR")})` : ""}
                </option>
              ))}
            </select>
            <button type="button" className="tcg-value__link" onClick={onOpenPurchases}>
              Compras y ganancia
            </button>
          </div>
        </div>
        <button type="button" className="tcg-value__wish" onClick={onOpenWishlist}>
          <Star size={16} fill="currentColor" />
          <span>
            <b>Lista de deseos</b>
            <small>
              {wishCount} carta{wishCount === 1 ? "" : "s"}
              {wishTotal > 0 ? ` · ${formatUsd(wishTotal)}` : ""}
            </small>
          </span>
        </button>
      </div>

      {series.length > 1 && (
        <>
          <div className="tcg-value__ranges" role="tablist" aria-label="Período">
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                role="tab"
                aria-selected={range === r.key}
                className={range === r.key ? "active" : ""}
                onClick={() => setRange(r.key)}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className="tcg-value__chart">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="none"
              role="img"
              aria-label={`Valor de la colección: de ${formatUsd(series[0].value)} el ${shortDate(series[0].day)} a ${formatUsd(series[series.length - 1].value)} hoy`}
              onPointerMove={onMove}
              onPointerDown={onMove}
              onPointerLeave={() => setHover(null)}
            >
              <defs>
                <linearGradient id="tcgValueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={area} fill="url(#tcgValueFill)" />
              <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
              {hp && (
                <line x1={x(hover)} x2={x(hover)} y1="0" y2={H} stroke="var(--text-faint)" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeDasharray="3 3" />
              )}
            </svg>
            {hp && (
              <>
                <span
                  className="tcg-value__dot"
                  style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(hp.value) / H) * 100}%` }}
                />
                <div className="tcg-value__tip" style={{ left: `${Math.min(85, Math.max(15, (x(hover) / W) * 100))}%` }}>
                  <b>{formatUsd(hp.value)}</b>
                  <span>{shortDate(hp.day)}</span>
                </div>
              </>
            )}
            <div className="tcg-value__axis">
              <span>{shortDate(series[0].day)}</span>
              <span>Hoy</span>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
