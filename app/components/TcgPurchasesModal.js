"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { formatUsd, toUsd, moneyInPesos } from "../../lib/tcgCard";
import { tcgGame } from "../../lib/tcgGames";

// Compras y ganancia: anotás lo que gastaste en producto sellado (sobres,
// cajas…) por juego, y se compara lo invertido — esas compras más lo que
// pagaste por cartas sueltas — contra lo que vale hoy lo que tenés.
export default function TcgPurchasesModal({ purchases, games, values, cardInvested, onAdd, onDelete, onClose }) {
  const [game, setGame] = useState(games[0] || "onepiece");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [day, setDay] = useState(new Date().toLocaleDateString("en-CA"));
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const raw = amount.trim().replace(/\./g, moneyInPesos() ? "" : ".").replace(",", ".");
    const usd = toUsd(raw);
    if (!description.trim() || usd == null || usd < 0) return;
    setSaving(true);
    const ok = await onAdd({ game, description: description.trim(), amount: Math.round(usd * 10000) / 10000, day });
    setSaving(false);
    if (ok) {
      setDescription("");
      setAmount("");
    }
  }

  const rows = games.map((g) => {
    const bought = purchases.filter((p) => p.game === g).reduce((n, p) => n + p.amount, 0);
    const invested = bought + (cardInvested[g] || 0);
    const value = values[g] || 0;
    return { g, bought, singles: cardInvested[g] || 0, invested, value, pl: value - invested };
  });
  const tot = rows.reduce(
    (a, r) => ({ invested: a.invested + r.invested, value: a.value + r.value }),
    { invested: 0, value: 0 }
  );

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal--wide">
        <h2>Compras y ganancia</h2>
        <p className="section-header__sub" style={{ marginTop: -8 }}>
          Anotá lo que gastás en sobres y cajas. Lo que pagaste por cartas sueltas se carga en el detalle de cada carta.
          Se compara contra lo que valen hoy todas tus cartas.
        </p>

        <div className="tcg-pl">
          {rows.map((r) => (
            <div key={r.g} className="tcg-pl__row">
              <b>{tcgGame(r.g).name}</b>
              <span>
                Invertido {formatUsd(r.invested)}
                {r.singles > 0 && <small> (sueltas {formatUsd(r.singles)})</small>}
              </span>
              <span>Valor {formatUsd(r.value)}</span>
              <span className={r.pl >= 0 ? "tcg-value__delta--up" : "tcg-value__delta--down"}>
                {r.pl >= 0 ? "+" : "−"}
                {formatUsd(Math.abs(r.pl))}
              </span>
            </div>
          ))}
          {rows.length > 1 && (
            <div className="tcg-pl__row tcg-pl__row--total">
              <b>Total</b>
              <span>Invertido {formatUsd(tot.invested)}</span>
              <span>Valor {formatUsd(tot.value)}</span>
              <span className={tot.value - tot.invested >= 0 ? "tcg-value__delta--up" : "tcg-value__delta--down"}>
                {tot.value - tot.invested >= 0 ? "+" : "−"}
                {formatUsd(Math.abs(tot.value - tot.invested))}
              </span>
            </div>
          )}
        </div>

        <form className="tcg-pl__form" onSubmit={submit}>
          {games.length > 1 && (
            <select value={game} onChange={(e) => setGame(e.target.value)} aria-label="Juego">
              {games.map((g) => (
                <option key={g} value={g}>
                  {tcgGame(g).name}
                </option>
              ))}
            </select>
          )}
          <input
            type="text"
            placeholder="Qué compraste (ej. Caja OP-13)"
            value={description}
            maxLength={120}
            onChange={(e) => setDescription(e.target.value)}
          />
          <input
            type="text"
            inputMode="decimal"
            placeholder={moneyInPesos() ? "Monto ($)" : "Monto (US$)"}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <input type="date" value={day} onChange={(e) => setDay(e.target.value)} aria-label="Fecha" />
          <button type="submit" className="btn" disabled={saving}>
            Anotar
          </button>
        </form>

        {purchases.length > 0 && (
          <ul className="tcg-pl__list">
            {purchases.map((p) => (
              <li key={p.id}>
                <span>
                  <b>{p.description}</b>
                  <small>
                    {tcgGame(p.game).name} · {new Date(p.day + "T12:00:00").toLocaleDateString("es-AR")}
                  </small>
                </span>
                <span className="tcg-pl__amount">{formatUsd(p.amount)}</span>
                <button type="button" className="icon-btn" title="Borrar compra" onClick={() => onDelete(p)}>
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="modal__actions">
          <span />
          <button type="button" className="btn subtle" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
