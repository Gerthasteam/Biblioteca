// Cada carta que entra a la carpeta TCG (exportada en bloque o cargada a
// mano con el buscador) lleva una marca oculta al final de las notas con el
// juego, el set y el id de la carta. Con eso se arma cada "carpeta" (una
// por expansión) y se evitan duplicados si volvés a exportar el mismo set.
export function tcgRefTag(game, setId, cardId) {
  return `#tcgref:${game}:${setId}:${cardId}`;
}

export function withTcgRef(notes, game, setId, setName, cardId) {
  const base = (notes || "")
    .replace(/\n?Set: .+$/m, "")
    .replace(/\n?#tcgref:\S+/m, "")
    .trim();
  const lines = [];
  if (base) lines.push(base);
  if (setName) lines.push(`Set: ${setName}`);
  lines.push(tcgRefTag(game, setId, cardId));
  return lines.join("\n");
}

export function parseTcgRef(notes) {
  const m = /#tcgref:([a-z]+):([^:\s]+):(\S+)/.exec(notes || "");
  if (!m) return null;
  return { game: m[1], setId: m[2], cardId: m[3] };
}

export function parseSetName(notes) {
  const m = /^Set: (.+)$/m.exec(notes || "");
  return m ? m[1].trim() : null;
}

// Ids de carta ya presentes para un juego (y opcionalmente un set puntual),
// leyendo la marca de las notas de los items existentes.
export function ownedCardIds(items, game, setId) {
  const ids = new Set();
  for (const it of items) {
    const ref = parseTcgRef(it.notes);
    if (ref && ref.game === game && (!setId || ref.setId === setId)) ids.add(ref.cardId);
  }
  return ids;
}

export function folderKey(game, setId) {
  return `${game}:${setId}`;
}

// Id único para una carta cargada a mano en una carpeta manual (no viene de
// ninguna API, así que no hay un id "real" que reusar).
export function newCardId() {
  return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// El código corto del set para mostrar al lado del nombre — "OP-01" -> "OP01".
export function formatSetCode(setId) {
  if (!setId) return null;
  return String(setId).replace(/-/g, "").toUpperCase();
}

function setSortKey(f) {
  const m = String(f.setId || "").match(/(\d+)/);
  return m ? parseInt(m[1], 10) : Infinity;
}

// Agrupa los items TCG en "carpetas" por expansión, más las carpetas
// armadas a mano (customFolders, de la tabla tcg_folders — puede venir
// vacía). Las cartas TCG sin marca (cargadas antes de que existiera este
// sistema) caen en una carpeta "Otras cartas" al final, para no perderlas
// de vista.
export function groupTcgFolders(items, customFolders = []) {
  const map = new Map();
  const misc = [];
  for (const it of items) {
    if (it.category !== "tcg") continue;
    const ref = parseTcgRef(it.notes);
    if (!ref) {
      misc.push(it);
      continue;
    }
    const key = folderKey(ref.game, ref.setId);
    if (!map.has(key)) {
      map.set(key, {
        key,
        game: ref.game,
        setId: ref.setId,
        setName: parseSetName(it.notes) || ref.setId,
        custom: ref.game === "custom",
        items: []
      });
    }
    map.get(key).items.push(it);
  }

  // El nombre de una carpeta manual manda desde la tabla (así renombrarla
  // no implica reescribir las notas de cada carta ya cargada), y una
  // carpeta manual todavía sin cartas también tiene que aparecer.
  for (const f of customFolders) {
    const key = folderKey("custom", f.id);
    if (map.has(key)) {
      map.get(key).setName = f.name;
    } else {
      map.set(key, { key, game: "custom", setId: f.id, setName: f.name, custom: true, items: [] });
    }
  }

  // Agrupa por juego y, dentro de cada juego, ordena por el número del set
  // (OP01, OP02, …) así las carpetas quedan en el orden de salida oficial;
  // las manuales van aparte, ordenadas por nombre.
  const official = Array.from(map.values())
    .filter((f) => !f.custom)
    .sort((a, b) => {
      if (a.game !== b.game) return (a.game || "").localeCompare(b.game || "");
      const ka = setSortKey(a);
      const kb = setSortKey(b);
      if (ka !== kb) return ka - kb;
      return a.setName.localeCompare(b.setName);
    });
  const custom = Array.from(map.values())
    .filter((f) => f.custom)
    .sort((a, b) => a.setName.localeCompare(b.setName));

  const folders = [...official, ...custom];
  if (misc.length) folders.push({ key: "otras", game: null, setId: null, setName: "Otras cartas", items: misc });
  return folders;
}
