// Ayudas para los mazos TCG, compartidas por /api/tcg/decks y /api/tcg/decks/[id].
export function cleanDeckCards(list) {
  const out = new Map();
  for (const c of Array.isArray(list) ? list : []) {
    const number = String(c?.number || "").trim().toUpperCase().slice(0, 20);
    const qty = Math.max(0, Math.min(50, parseInt(c?.qty, 10) || 0));
    if (!number || !qty) continue;
    out.set(number, Math.min(50, (out.get(number) || 0) + qty));
  }
  return [...out].slice(0, 120).map(([number, qty]) => ({ number, qty }));
}

export function rowToDeck(r) {
  return { id: String(r.id), game: r.game, name: r.name, cards: r.cards || [], updatedAt: r.updated_at };
}
