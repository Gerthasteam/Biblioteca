"use client";

import { useMemo } from "react";
import { ChevronLeft, Copy, Share2 } from "lucide-react";
import { tcgQuantity, tcgCardKey, formatUsd, SHOW_PRICES } from "../../lib/tcgCard";
import { parseTcgRef, parseSetName } from "../../lib/tcgRef";
import { tcgGame } from "../../lib/tcgGames";

// Intercambios: las cartas que tenés repetidas (2 copias o más → te sobran
// las demás) y las que buscás (lista de deseos que todavía no tenés), con
// una lista en texto para mandarle a otro coleccionista.
export default function TcgTrades({ items, priceOf, onOpen, onBack, onToast }) {
  const { extras, wanted } = useMemo(() => {
    const tcg = items.filter((it) => it.category === "tcg");
    return {
      extras: tcg.filter((it) => tcgQuantity(it) >= 2).map((it) => ({ it, extra: tcgQuantity(it) - 1 })),
      wanted: tcg.filter((it) => it.wish && tcgQuantity(it) === 0)
    };
  }, [items]);

  function label(it) {
    const ref = parseTcgRef(it.notes);
    const key = tcgCardKey(it);
    const game = ref && ref.game !== "custom" ? tcgGame(ref.game).name : "";
    return `${it.title}${key && ref?.game !== "custom" ? ` (${key})` : ""}${game ? ` · ${game}` : ""}`;
  }

  const text = [
    extras.length ? "Tengo para cambiar:" : "",
    ...extras.map(({ it, extra }) => `- ${label(it)}${extra > 1 ? ` x${extra}` : ""}`),
    extras.length && wanted.length ? "" : "",
    wanted.length ? "Busco:" : "",
    ...wanted.map((it) => `- ${label(it)}`)
  ]
    .filter((l, i, arr) => l !== "" || (i > 0 && arr[i - 1] !== ""))
    .join("\n")
    .trim();

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Mis intercambios TCG", text });
        return;
      } catch {
        /* cancelado: cae a copiar */
      }
    }
    navigator.clipboard?.writeText(text).then(
      () => onToast("Lista copiada."),
      () => window.prompt("Copiá la lista:", text)
    );
  }

  const Row = ({ it, right }) => (
    <div className="manga-row">
      <span className="manga-row__thumb" style={{ backgroundImage: it.coverUrl ? `url('${it.coverUrl.replace(/'/g, "%27")}')` : undefined }} />
      <div className="manga-row__body">
        <button type="button" className="manga-row__name" onClick={() => onOpen(it.id)}>
          {it.title}
        </button>
        <small>
          {[tcgCardKey(it), parseSetName(it.notes)].filter(Boolean).join(" · ")}
          {SHOW_PRICES && priceOf(it) != null ? ` · ${formatUsd(priceOf(it))}` : ""}
        </small>
      </div>
      {right}
    </div>
  );

  return (
    <div className="manga-list">
      <div className="tcg-game-row">
        <button type="button" className="btn subtle" onClick={onBack}>
          <ChevronLeft size={14} />
          Mis TCG
        </button>
        <button type="button" className="btn" onClick={share} disabled={!text}>
          {typeof navigator !== "undefined" && navigator.share ? <Share2 size={14} /> : <Copy size={14} />}
          Compartir lista
        </button>
      </div>
      <section>
        <h3 className="manga-list__title">
          Tengo para cambiar {extras.length > 0 && <span>· {extras.reduce((n, e) => n + e.extra, 0)} cartas</span>}
        </h3>
        {extras.length === 0 ? (
          <p className="empty-note">No tenés cartas repetidas. Cuando sumes una segunda copia (con el + de la carta), aparece acá.</p>
        ) : (
          extras.map(({ it, extra }) => <Row key={it.id} it={it} right={<span className="trade-qty">+{extra}</span>} />)
        )}
      </section>
      <section>
        <h3 className="manga-list__title">Busco {wanted.length > 0 && <span>· {wanted.length}</span>}</h3>
        {wanted.length === 0 ? (
          <p className="empty-note">Marcá con ★ las cartas que buscás y aparecen acá.</p>
        ) : (
          wanted.map((it) => <Row key={it.id} it={it} />)
        )}
      </section>
    </div>
  );
}
