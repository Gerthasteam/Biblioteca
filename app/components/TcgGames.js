"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { TCG_GAMES, tcgGame, tcgLogoUrl } from "../../lib/tcgGames";
import { formatSetCode } from "../../lib/tcgRef";

// "2023/03/31" (formato de la API de Pokémon) -> "31 mar 2023"
function formatReleaseDate(raw) {
  const m = /^(\d{4})[/-](\d{2})[/-](\d{2})/.exec(raw || "");
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d
    .toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })
    .replace(/ de /g, " ")
    .replace(".", "");
}

// Carpeta (expansión o carpeta manual) dentro de un juego: recuadro con el
// logo del set arriba (o el nombre escrito con los colores del juego si la
// API no trae logo, como One Piece), etiqueta con la fecha de salida o el
// código del set, y abajo el nombre + cuántas cartas tenés.
export function TcgFolderTile({ folder, gameKey, meta, onOpen, onDelete }) {
  const game = tcgGame(gameKey);
  const [logoFailed, setLogoFailed] = useState(false);
  const owned = folder.items.filter((it) => it.status === "completo").length;
  const total = folder.items.length;
  const pct = total > 0 ? Math.round((owned / total) * 100) : 0;
  const badge = formatReleaseDate(meta?.releaseDate) || (!folder.custom && formatSetCode(folder.setId)) || null;
  const showLogo = meta?.logo && !logoFailed;

  return (
    <div className="tcg-set">
      <button type="button" className="tcg-set__card" onClick={onOpen} title={folder.setName}>
        {badge && <span className="tcg-set__badge">{badge}</span>}
        {showLogo ? (
          <img className="tcg-set__logo" src={meta.logo} alt={folder.setName} onError={() => setLogoFailed(true)} />
        ) : (
          <span className="tcg-set__wordmark" style={{ color: game.colors[1] }}>
            {folder.setName}
          </span>
        )}
        <span className="tcg-set__bar">
          <span className="tcg-set__bar-fill" style={{ width: pct + "%" }} />
        </span>
      </button>
      <button
        type="button"
        className="tcg-set__delete"
        title="Borrar carpeta"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <Trash2 size={13} />
      </button>
      <button type="button" className="tcg-set__info" onClick={onOpen}>
        <span className="tcg-set__name">{folder.setName}</span>
        <span className="tcg-set__count">
          {total === 0 ? "Vacía" : `${owned}/${total} cartas · ${pct}%`}
        </span>
      </button>
    </div>
  );
}

// Logo del juego. Si todavía no está la imagen en /public/tcg-logos (o no
// carga), cae al nombre escrito con los colores del juego.
export function TcgLogo({ gameKey, small }) {
  const game = tcgGame(gameKey);
  const [failed, setFailed] = useState(false);
  if (game.logo && !failed) {
    return (
      <img
        className={"tcg-logo" + (small ? " tcg-logo--small" : "") + (game.logoLight ? " tcg-logo--light" : "")}
        src={tcgLogoUrl(game.key)}
        alt={game.name}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span
      className={"tcg-wordmark" + (small ? " tcg-wordmark--small" : "")}
      style={{ color: game.colors[0], textShadow: `0 2px 0 ${game.colors[1]}, 0 0 14px ${game.colors[1]}88` }}
    >
      {game.name}
    </span>
  );
}

// Tarjeta de un juego en la grilla de la sección TCG.
export function TcgGameTile({ gameKey, meta, onClick }) {
  return (
    <button type="button" className="tcg-game-tile" onClick={onClick} title={tcgGame(gameKey).name}>
      <span className="tcg-game-tile__logo">
        <TcgLogo gameKey={gameKey} />
      </span>
      {meta && <span className="tcg-game-tile__meta">{meta}</span>}
    </button>
  );
}

export function TcgAddGameTile({ onClick }) {
  return (
    <button type="button" className="tcg-game-tile tcg-game-tile--add" onClick={onClick}>
      <Plus size={26} />
      <span className="tcg-game-tile__meta">Agregar juego</span>
    </button>
  );
}

// Ventana con todos los juegos del catálogo que todavía no agregaste.
export function TcgGamePicker({ added, onPick, onClose }) {
  const available = TCG_GAMES.filter((g) => !added.includes(g.key));
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal--wide">
        <h2>Agregar juego</h2>
        <p className="section-header__sub" style={{ marginTop: -8 }}>
          One Piece y Pokémon pueden exportar expansiones completas; en los demás armás tus carpetas a mano.
        </p>
        {available.length === 0 ? (
          <p className="empty-note">Ya agregaste todos los juegos disponibles.</p>
        ) : (
          <div className="tcg-game-grid tcg-game-grid--picker">
            {available.map((g) => (
              <TcgGameTile key={g.key} gameKey={g.key} onClick={() => onPick(g.key)} />
            ))}
          </div>
        )}
        <div className="modal__actions">
          <button type="button" className="btn subtle" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
