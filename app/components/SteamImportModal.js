"use client";

import { useState } from "react";
import { Search, Download } from "lucide-react";

// Modal para traer toda tu biblioteca de Steam de una sola vez: pedimos tu
// usuario/link/SteamID, mostramos la lista completa con checkboxes (lo que
// ya está cargado en tu colección viene destildado) y lo que quede
// seleccionado se manda junto a /api/items/bulk.
export default function SteamImportModal({ existingTitles, onClose, onImport }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [games, setGames] = useState(null); // null = todavía no buscamos
  const [selected, setSelected] = useState(new Set());
  const [importing, setImporting] = useState(false);
  const [query, setQuery] = useState("");

  async function handleSearch(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/steam/import?id=${encodeURIComponent(input.trim())}`);
      const json = await res.json();
      if (json.error) {
        setError(json.message || "No se pudo importar.");
        setGames(null);
        return;
      }
      const list = json.games || [];
      setGames(list);
      setSelected(new Set(list.filter((g) => !existingTitles.has(g.title.toLowerCase().trim())).map((g) => g.appid)));
    } catch {
      setError("No se pudo conectar con Steam.");
    } finally {
      setLoading(false);
    }
  }

  function toggle(appid) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(appid)) next.delete(appid);
      else next.add(appid);
      return next;
    });
  }

  const shown = !games ? [] : !query ? games : games.filter((g) => g.title.toLowerCase().includes(query.toLowerCase()));

  async function handleImport() {
    if (!games) return;
    const toImport = games.filter((g) => selected.has(g.appid));
    if (!toImport.length) return;
    setImporting(true);
    const payload = toImport.map((g) => ({
      title: g.title,
      category: "videojuego",
      status: g.minutes > 0 ? "progreso" : "pendiente",
      unit: "Hora",
      current: Math.round(g.minutes / 60),
      total: null,
      rating: 0,
      notes: "",
      coverUrl: g.cover
    }));
    try {
      await onImport(payload);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <h2>Importar de Steam</h2>

        {!games && (
          <form onSubmit={handleSearch} className="field">
            <p className="section-header__sub" style={{ marginTop: -4, marginBottom: 2 }}>
              Pegá tu usuario de Steam (el de la URL de tu perfil), el link completo, o tu SteamID64. Tu perfil
              necesita tener "Detalles del juego" en público en la configuración de privacidad de Steam.
            </p>
            <label htmlFor="steamId">Usuario o link de tu perfil</label>
            <input
              id="steamId"
              type="text"
              placeholder="Ej: gaben o steamcommunity.com/id/gaben"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoComplete="off"
            />
            {error && <div className="search-picker__empty" style={{ padding: "8px 0 0" }}>{error}</div>}
          </form>
        )}

        {games && (
          <>
            <span className="search-wrap tcg-picker__filter">
              <Search size={13} />
              <input
                type="text"
                className="search"
                placeholder="Filtrar…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </span>
            <div className="tcg-folder-summary__sub" style={{ marginTop: -6 }}>
              {selected.size} de {games.length} seleccionados — lo que ya tenés cargado viene destildado.
            </div>
            <div className="steam-import-list">
              {shown.map((g) => {
                const already = existingTitles.has(g.title.toLowerCase().trim());
                return (
                  <label key={g.appid} className="steam-import-row">
                    <input type="checkbox" checked={selected.has(g.appid)} onChange={() => toggle(g.appid)} />
                    <img src={g.cover} alt="" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
                    <span className="steam-import-row__info">
                      <span className="steam-import-row__title">{g.title}</span>
                      <span className="steam-import-row__meta">
                        {already ? "Ya la tenés" : g.minutes > 0 ? `${Math.round(g.minutes / 60)} h jugadas` : "Sin jugar"}
                      </span>
                    </span>
                  </label>
                );
              })}
              {shown.length === 0 && <div className="search-picker__empty">Sin resultados.</div>}
            </div>
          </>
        )}

        <div className="modal__actions">
          <button type="button" className="btn subtle" onClick={onClose}>
            Cancelar
          </button>
          <div className="modal__actions-right">
            {!games ? (
              <button type="button" className="btn" disabled={loading || !input.trim()} onClick={handleSearch}>
                {loading ? "Buscando…" : "Buscar biblioteca"}
              </button>
            ) : (
              <button type="button" className="btn" disabled={importing || selected.size === 0} onClick={handleImport}>
                <Download size={14} />
                {importing ? "Importando…" : `Importar ${selected.size}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
