"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Plus, Folder, FolderPlus, ChevronLeft, Trash2, Pencil, Download } from "lucide-react";
import Sidebar from "./components/Sidebar";
import BottomNav from "./components/BottomNav";
import Home from "./components/Home";
import CardGrid from "./components/CardGrid";
import Shelf from "./components/Shelf";
import Binder from "./components/Binder";
import ItemModal from "./components/ItemModal";
import AnimeModal from "./components/AnimeModal";
import DetailModal from "./components/DetailModal";
import TcgFolderModal from "./components/TcgFolderModal";
import SteamImportModal from "./components/SteamImportModal";
import { CATEGORY_LABEL } from "../lib/ui";
import { groupTcgFolders, parseTcgRef, formatSetCode } from "../lib/tcgRef";

const EXAMPLE_MANGA = [
  { title: "Vinland Saga", category: "manga", current: 112, total: 220, rating: 5, status: "progreso" },
  { title: "Berserk", category: "manga", current: 41, total: 41, rating: 5, status: "completo" }
];
const EXAMPLE_GAMES = [
  { title: "Elden Ring", category: "videojuego", current: 40, total: null, rating: 5, status: "progreso" }
];
const EXAMPLE_TCG = [
  { title: "Pokémon TCG · Base Set", category: "tcg", current: 60, total: 102, rating: 4, status: "progreso" },
  { title: "One Piece TCG · Romance Dawn", category: "tcg", current: 24, total: 121, rating: 4, status: "progreso" }
];
const EXAMPLE_LIBRARY = [...EXAMPLE_MANGA, ...EXAMPLE_TCG];
const EXAMPLE_ANIMES = [
  { title: "Frieren: Beyond Journey's End", current: 28, total: 28, rating: 5, status: "completo" }
];

const VIEW_META = {
  manga: { title: "Manga", tag: "Colección" },
  anime: { title: "Anime", tag: "Colección" },
  videojuego: { title: "Videojuegos", tag: "Colección" },
  biblioteca: { title: "Biblioteca", tag: "Todo junto" }
};

export default function App() {
  const [view, setView] = useState("home");
  const [categoryFilter, setCategoryFilter] = useState("manga");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState([]);
  const [animes, setAnimes] = useState([]);
  const [customFolders, setCustomFolders] = useState([]); // [{ id, name }] — carpetas TCG armadas a mano
  const [toast, setToast] = useState(null);

  const [itemModal, setItemModal] = useState(null); // { editing, defaultCategory } | null
  const [animeModal, setAnimeModal] = useState(null);
  const [detail, setDetail] = useState(null); // { kind, id } | null
  const [folderModal, setFolderModal] = useState(null); // { game } | null
  const [activeTcgFolder, setActiveTcgFolder] = useState(null); // { key, game, setId, setName } | null
  const [steamImportOpen, setSteamImportOpen] = useState(false);

  function flashToast(msg) {
    setToast(msg);
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 3500);
  }

  function navigate(next) {
    setView(next);
    setSearch("");
    setCategoryFilter("manga");
    setActiveTcgFolder(null);
  }

  function selectCategoryFilter(c) {
    setCategoryFilter(c);
    setActiveTcgFolder(null);
  }

  async function loadAll() {
    try {
      const [ir, ar, fr] = await Promise.all([fetch("/api/items"), fetch("/api/animes"), fetch("/api/tcg/folders")]);
      const [ij, aj, fj] = await Promise.all([ir.json(), ar.json(), fr.json()]);
      if (ij.items) setItems(ij.items);
      if (aj.animes) setAnimes(aj.animes);
      if (fj.folders) setCustomFolders(fj.folders);
      if (ij.error || aj.error) {
        flashToast("Todavía no conectaste la base de datos — los cambios no se guardan.");
      }
    } catch {
      flashToast("No se pudo conectar con el servidor.");
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const mangaItems = useMemo(() => items.filter((i) => i.category === "manga"), [items]);
  const gameItems = useMemo(() => items.filter((i) => i.category === "videojuego"), [items]);

  const filterBySearch = (list, key = "title") =>
    !search ? list : list.filter((r) => r[key].toLowerCase().includes(search.toLowerCase()));

  const shownManga = useMemo(() => filterBySearch(mangaItems), [mangaItems, search]);
  const shownGames = useMemo(() => filterBySearch(gameItems), [gameItems, search]);
  const shownAnimes = useMemo(() => filterBySearch(animes), [animes, search]);
  const shownLibrary = useMemo(() => {
    const list = items.filter((i) => i.category === categoryFilter);
    return filterBySearch(list);
  }, [items, categoryFilter, search]);

  const tcgFolders = useMemo(() => groupTcgFolders(items, customFolders), [items, customFolders]);
  const activeFolderItems = useMemo(() => {
    if (!activeTcgFolder) return [];
    return items.filter((it) => {
      if (it.category !== "tcg") return false;
      const ref = parseTcgRef(it.notes);
      if (activeTcgFolder.setId === null) return !ref;
      return ref && ref.game === activeTcgFolder.game && ref.setId === activeTcgFolder.setId;
    });
  }, [items, activeTcgFolder]);
  const shownFolderItems = useMemo(() => filterBySearch(activeFolderItems), [activeFolderItems, search]);

  // ---- item CRUD ----
  async function saveItem(data) {
    const editingId = itemModal?.editing?.id;
    try {
      const res = await fetch(editingId ? `/api/items/${editingId}` : "/api/items", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "error");
      setItems((prev) => {
        if (editingId) return prev.map((it) => (it.id === editingId ? json.item : it));
        return [...prev, json.item];
      });
      setItemModal(null);
    } catch (err) {
      flashToast("No se pudo guardar: " + err.message);
    }
  }
  async function deleteItem(id) {
    setItems((prev) => prev.filter((it) => it.id !== id));
    setItemModal(null);
    setDetail(null);
    try {
      await fetch(`/api/items/${id}`, { method: "DELETE" });
    } catch {
      flashToast("No se pudo eliminar en el servidor.");
    }
  }

  // Reordena (arrastrar y soltar) el subconjunto que matchea `matchFn` — el
  // resto de los items no se toca.
  function reorderItems(matchFn, orderedIds) {
    setItems((prev) => {
      const byId = new Map(prev.map((it) => [it.id, it]));
      const reordered = orderedIds.map((id) => byId.get(id)).filter(Boolean);
      let i = 0;
      return prev.map((it) => (matchFn(it) ? reordered[i++] : it));
    });
    fetch("/api/items/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: orderedIds })
    }).catch(() => flashToast("No se pudo guardar el orden nuevo."));
  }

  function reorderCategory(category, orderedIds) {
    reorderItems((it) => it.category === category, orderedIds);
  }

  function reorderTcgFolder(folder, orderedIds) {
    reorderItems((it) => {
      if (it.category !== "tcg") return false;
      const ref = parseTcgRef(it.notes);
      if (folder.setId === null) return !ref;
      return ref && ref.game === folder.game && ref.setId === folder.setId;
    }, orderedIds);
  }

  // Prende/apaga una carta de la carpeta (la tenés / no la tenés) sin abrir
  // el modal de edición.
  function toggleOwned(item) {
    const nextStatus = item.status === "completo" ? "pendiente" : "completo";
    setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, status: nextStatus } : it)));
    fetch(`/api/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...item, status: nextStatus })
    }).catch(() => flashToast("No se pudo actualizar la carta."));
  }

  // "Carpeta TCG": exporta en bloque todas las cartas que falten de una
  // expansión (ya vienen filtradas por TcgFolderModal), las agrega apagadas
  // y abre directamente la carpeta nueva.
  async function exportTcgSet(payloadItems, meta) {
    try {
      const res = await fetch("/api/items/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payloadItems })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "error");
      setItems((prev) => [...prev, ...(json.items || [])]);
      setFolderModal(null);
      setCategoryFilter("tcg");
      setActiveTcgFolder({ game: meta.game, setId: meta.set.id, setName: meta.set.name });
      flashToast(
        json.items.length
          ? `Se creó la carpeta "${meta.set.name}" con ${json.items.length} cartas.`
          : "No había cartas nuevas para exportar."
      );
    } catch (err) {
      flashToast("No se pudo exportar la carpeta: " + err.message);
    }
  }

  // Importar de Steam: la lista ya viene armada (con checkboxes) desde
  // SteamImportModal, acá solo la mandamos en bloque igual que exportTcgSet.
  async function importSteamGames(payloadItems) {
    try {
      const res = await fetch("/api/items/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payloadItems })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "error");
      setItems((prev) => [...prev, ...(json.items || [])]);
      setSteamImportOpen(false);
      flashToast(
        json.items.length
          ? `Se importaron ${json.items.length} juego${json.items.length === 1 ? "" : "s"} de Steam.`
          : "No había juegos nuevos para importar."
      );
    } catch (err) {
      flashToast("No se pudo importar: " + err.message);
    }
  }

  function openTcgFolder(folder) {
    setFolderModal(null);
    setCategoryFilter("tcg");
    setActiveTcgFolder(folder);
  }

  // Carpeta TCG armada a mano (botón "Nueva carpeta"): no viene de exportar
  // una expansión, así que arranca vacía y se le van agregando cartas.
  async function createCustomFolder() {
    const name = window.prompt("Nombre de la carpeta:");
    if (!name || !name.trim()) return;
    try {
      const res = await fetch("/api/tcg/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "error");
      setCustomFolders((prev) => [...prev, json.folder]);
      setCategoryFilter("tcg");
      setActiveTcgFolder({
        key: `custom:${json.folder.id}`,
        game: "custom",
        setId: json.folder.id,
        setName: json.folder.name,
        custom: true,
        items: []
      });
    } catch (err) {
      flashToast("No se pudo crear la carpeta: " + err.message);
    }
  }

  async function renameCustomFolder(folder) {
    const name = window.prompt("Nuevo nombre de la carpeta:", folder.setName);
    if (!name || !name.trim() || name.trim() === folder.setName) return;
    try {
      const res = await fetch(`/api/tcg/folders/${folder.setId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "error");
      setCustomFolders((prev) => prev.map((f) => (f.id === folder.setId ? json.folder : f)));
      setActiveTcgFolder((prev) => (prev && prev.setId === folder.setId ? { ...prev, setName: json.folder.name } : prev));
    } catch (err) {
      flashToast("No se pudo renombrar la carpeta: " + err.message);
    }
  }

  // Borra una carpeta TCG entera (todas sus cartas, y si es manual también
  // el registro de la carpeta — puede estar vacía todavía).
  async function deleteTcgFolder(folder, ids) {
    if (!ids.length && folder.game !== "custom") return;
    const label = folder.setName || "esta carpeta";
    const msg = ids.length
      ? `¿Borrar la carpeta "${label}" y sus ${ids.length} carta${ids.length === 1 ? "" : "s"}? No se puede deshacer.`
      : `¿Borrar la carpeta "${label}"? No se puede deshacer.`;
    if (!window.confirm(msg)) return;
    if (ids.length) setItems((prev) => prev.filter((it) => !ids.includes(it.id)));
    if (folder.game === "custom") setCustomFolders((prev) => prev.filter((f) => f.id !== folder.setId));
    if (activeTcgFolder && activeTcgFolder.game === folder.game && activeTcgFolder.setId === folder.setId) {
      setActiveTcgFolder(null);
    }
    try {
      if (ids.length) {
        const res = await fetch("/api/items/bulk", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids })
        });
        if (!res.ok) throw new Error("error");
      }
      if (folder.game === "custom") {
        await fetch(`/api/tcg/folders/${folder.setId}`, { method: "DELETE" });
      }
      flashToast(`Carpeta "${label}" borrada.`);
    } catch {
      flashToast("No se pudo borrar la carpeta en el servidor.");
    }
  }

  // ---- anime CRUD ----
  async function saveAnime(data) {
    const editingId = animeModal?.editing?.id;
    try {
      const res = await fetch(editingId ? `/api/animes/${editingId}` : "/api/animes", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "error");
      setAnimes((prev) => {
        if (editingId) return prev.map((a) => (a.id === editingId ? json.anime : a));
        return [...prev, json.anime];
      });
      setAnimeModal(null);
    } catch (err) {
      flashToast("No se pudo guardar: " + err.message);
    }
  }
  async function deleteAnime(id) {
    setAnimes((prev) => prev.filter((a) => a.id !== id));
    setAnimeModal(null);
    setDetail(null);
    try {
      await fetch(`/api/animes/${id}`, { method: "DELETE" });
    } catch {
      flashToast("No se pudo eliminar en el servidor.");
    }
  }

  // ---- detail / bump ----
  const detailRecord = useMemo(() => {
    if (!detail) return null;
    return detail.kind === "item" ? items.find((x) => x.id === detail.id) : animes.find((x) => x.id === detail.id);
  }, [detail, items, animes]);

  function openDetail(kind, id) {
    setDetail({ kind, id });
  }

  function bump(delta) {
    if (!detail || !detailRecord) return;
    let next = Math.max(0, (detailRecord.current || 0) + delta);
    if (detailRecord.total != null) next = Math.min(next, detailRecord.total);
    const payload = { ...detailRecord, current: next };
    delete payload.id;
    delete payload.createdAt;
    if (detail.kind === "item") {
      setItems((prev) => prev.map((it) => (it.id === detail.id ? { ...it, current: next } : it)));
      fetch(`/api/items/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).catch(() => flashToast("No se pudo actualizar en el servidor."));
    } else {
      setAnimes((prev) => prev.map((a) => (a.id === detail.id ? { ...a, current: next } : a)));
      fetch(`/api/animes/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).catch(() => flashToast("No se pudo actualizar en el servidor."));
    }
  }

  function openAddModal() {
    if (view === "anime") setAnimeModal({ editing: null });
    else if (view === "videojuego") setItemModal({ editing: null, defaultCategory: "videojuego" });
    else if (view === "biblioteca") setItemModal({ editing: null, defaultCategory: categoryFilter });
    else setItemModal({ editing: null, defaultCategory: "manga" });
  }

  const meta = VIEW_META[view];

  return (
    <div className="app-shell">
      <Sidebar view={view} onNavigate={navigate} />

      <header className="topbar">
        <div className="topbar__brand">
          <div className="topbar__logo">
            <img src="/mascot-icon.png" alt="" />
          </div>
          <div className="topbar__title">Mi Colección</div>
        </div>
      </header>

      <main className="main">
        {view === "home" && (
            <Home
              items={items}
              animes={animes}
              onNavigate={navigate}
              onOpen={openDetail}
            />
          )}

          {view !== "home" && (
            <>
              <div className="section-header">
                <div>
                  <h1>{meta.title}</h1>
                  <div className="section-header__sub">{meta.tag}</div>
                </div>
              </div>

              <section className="toolbar">
                <div className="toolbar__filters">
                  {view === "biblioteca" &&
                    ["manga", "tcg", "videojuego", "otro"].map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={"chip" + (categoryFilter === c ? " active" : "")}
                        onClick={() => selectCategoryFilter(c)}
                      >
                        {CATEGORY_LABEL[c]}
                      </button>
                    ))}
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <span className="search-wrap">
                    <Search size={14} />
                    <input
                      type="text"
                      className="search"
                      placeholder="Buscar por título…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </span>
                  <button type="button" className="btn" onClick={openAddModal}>
                    <Plus size={15} />
                    Agregar
                  </button>
                </div>
              </section>

              {view === "biblioteca" && categoryFilter === "tcg" && !activeTcgFolder && (
                <div className="tcg-game-row">
                  <button type="button" className="btn subtle" onClick={() => setFolderModal({ game: "onepiece" })}>
                    One Piece
                  </button>
                  <button type="button" className="btn subtle" onClick={createCustomFolder}>
                    <FolderPlus size={14} />
                    Nueva carpeta
                  </button>
                </div>
              )}

              {((view === "manga" && !search && mangaItems.length > 1) ||
                (view === "biblioteca" && categoryFilter === "manga" && !search && mangaItems.length > 1)) && (
                <p className="section-header__sub" style={{ marginTop: -10, marginBottom: 14 }}>
                  Mantené el click apretado sobre un manga para arrastrarlo y reordenarlo.
                </p>
              )}

              {view === "biblioteca" && categoryFilter === "tcg" && activeTcgFolder && !search && activeFolderItems.length > 1 && (
                <p className="section-header__sub" style={{ marginTop: -10, marginBottom: 14 }}>
                  Mantené el click apretado sobre una carta para arrastrarla y reordenarla.
                </p>
              )}

              {view === "manga" &&
                (mangaItems.length === 0 ? (
                  <>
                    <p className="empty-note" style={{ marginBottom: 16 }}>
                      Así se va a ver tu manga — agregá el primero para reemplazar el ejemplo.
                    </p>
                    <CardGrid records={EXAMPLE_MANGA} kind="item" isExample onOpen={() => {}} />
                  </>
                ) : shownManga.length === 0 ? (
                  <p className="empty-note">No hay títulos que coincidan con la búsqueda.</p>
                ) : (
                  <CardGrid
                    records={shownManga}
                    kind="item"
                    onOpen={(id) => openDetail("item", id)}
                    reorderable={!search}
                    onReorder={(ids) => reorderCategory("manga", ids)}
                  />
                ))}

              {view === "videojuego" && (
                <div className="tcg-game-row">
                  <button type="button" className="btn subtle" onClick={() => setSteamImportOpen(true)}>
                    <Download size={14} />
                    Importar de Steam
                  </button>
                </div>
              )}

              {view === "videojuego" &&
                (gameItems.length === 0 ? (
                  <>
                    <p className="empty-note" style={{ marginBottom: 16 }}>
                      Así se van a ver tus videojuegos — agregá el primero para reemplazar el ejemplo.
                    </p>
                    <CardGrid records={EXAMPLE_GAMES} kind="item" isExample onOpen={() => {}} />
                  </>
                ) : shownGames.length === 0 ? (
                  <p className="empty-note">No hay títulos que coincidan con la búsqueda.</p>
                ) : (
                  <CardGrid records={shownGames} kind="item" onOpen={(id) => openDetail("item", id)} />
                ))}

              {view === "anime" &&
                (animes.length === 0 ? (
                  <>
                    <p className="empty-note" style={{ marginBottom: 16 }}>
                      Así se van a ver tus animes — agregá el primero para reemplazar el ejemplo.
                    </p>
                    <CardGrid records={EXAMPLE_ANIMES} kind="anime" isExample onOpen={() => {}} />
                  </>
                ) : shownAnimes.length === 0 ? (
                  <p className="empty-note">No hay animes que coincidan con la búsqueda.</p>
                ) : (
                  <CardGrid records={shownAnimes} kind="anime" onOpen={(id) => openDetail("anime", id)} />
                ))}

              {view === "biblioteca" && categoryFilter === "tcg" && (
                <>
                  {search ? (
                    shownLibrary.length === 0 ? (
                      <p className="empty-note">No hay cartas que coincidan con la búsqueda.</p>
                    ) : (
                      <Binder items={shownLibrary} onToggleOwned={toggleOwned} onEdit={(id) => openDetail("item", id)} />
                    )
                  ) : activeTcgFolder ? (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                        <button type="button" className="btn subtle" onClick={() => setActiveTcgFolder(null)}>
                          <ChevronLeft size={14} />
                          Mis carpetas
                        </button>
                        <div style={{ display: "flex", gap: 8 }}>
                          {activeTcgFolder.game === "custom" && (
                            <button
                              type="button"
                              className="btn subtle"
                              onClick={() => setItemModal({ editing: null, defaultCategory: "tcg", tcgFolderTarget: { id: activeTcgFolder.setId, name: activeTcgFolder.setName } })}
                            >
                              <Plus size={14} />
                              Agregar carta
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn subtle"
                            onClick={() => deleteTcgFolder(activeTcgFolder, activeFolderItems.map((it) => it.id))}
                          >
                            <Trash2 size={14} />
                            Borrar carpeta
                          </button>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                        {activeFolderItems[0]?.coverUrl && (
                          <img
                            src={activeFolderItems[0].coverUrl}
                            alt=""
                            className="tcg-folder-tile__logo tcg-folder-tile__logo--header"
                          />
                        )}
                        <h2>
                          {activeTcgFolder.setName}
                          {activeTcgFolder.game !== "custom" && formatSetCode(activeTcgFolder.setId) && (
                            <span className="tcg-folder-tile__code"> ({formatSetCode(activeTcgFolder.setId)})</span>
                          )}
                        </h2>
                        {activeTcgFolder.game === "custom" && (
                          <button
                            type="button"
                            className="icon-btn"
                            title="Renombrar carpeta"
                            onClick={() => renameCustomFolder(activeTcgFolder)}
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                      </div>
                      {shownFolderItems.length === 0 ? (
                        <p className="empty-note">Esta carpeta todavía no tiene cartas.</p>
                      ) : (
                        <Binder
                          items={shownFolderItems}
                          onToggleOwned={toggleOwned}
                          onEdit={(id) => openDetail("item", id)}
                          reorderable
                          onReorder={(ids) => reorderTcgFolder(activeTcgFolder, ids)}
                        />
                      )}
                    </>
                  ) : tcgFolders.length === 0 ? (
                    <div className="empty-note empty-note--mascot">
                      <img src="/mascot.png" alt="" />
                      <p>
                        Todavía no tenés ninguna carpeta — exportá una expansión (One Piece) o creá una a mano con
                        "Nueva carpeta".
                      </p>
                    </div>
                  ) : (
                    <div className="tcg-folder-list">
                      {tcgFolders.map((f) => {
                        const owned = f.items.filter((it) => it.status === "completo").length;
                        const total = f.items.length;
                        const pct = total > 0 ? Math.round((owned / total) * 100) : 0;
                        const cover = f.items[0]?.coverUrl;
                        const code = !f.custom && formatSetCode(f.setId);
                        const meta = [code, total === 0 ? "0 cartas" : `${owned}/${total} cartas`]
                          .filter(Boolean)
                          .join(" · ");
                        return (
                          <div key={f.key} className="tcg-folder-row">
                            <button
                              type="button"
                              className="tcg-folder-row__open"
                              onClick={() => setActiveTcgFolder(f)}
                            >
                              <span className="tcg-folder-row__cover">
                                {cover ? <img src={cover} alt="" /> : <Folder size={18} />}
                              </span>
                              <span className="tcg-folder-row__body">
                                <span className="tcg-folder-row__top">
                                  <span className="tcg-folder-row__name">{f.setName}</span>
                                  <span className="tcg-folder-row__pct">{total === 0 ? "Vacía" : `${pct}%`}</span>
                                </span>
                                <span className="tcg-folder-row__meta">{meta}</span>
                                <span className="tcg-folder-row__bar">
                                  <span className="tcg-folder-row__bar-fill" style={{ width: pct + "%" }} />
                                </span>
                              </span>
                            </button>
                            <button
                              type="button"
                              className="tcg-folder-row__delete"
                              title="Borrar carpeta"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteTcgFolder(f, f.items.map((it) => it.id));
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {view === "biblioteca" &&
                categoryFilter !== "tcg" &&
                (items.length === 0 ? (
                  <>
                    <p className="empty-note shelf-empty-note" style={{ marginBottom: 16 }}>
                      Así se va a ir llenando tu estante — agregá el primer título para reemplazar el ejemplo.
                    </p>
                    <Shelf
                      items={EXAMPLE_LIBRARY.filter((i) => i.category === categoryFilter)}
                      isExample
                      onOpen={() => {}}
                    />
                  </>
                ) : shownLibrary.length === 0 ? (
                  <p className="empty-note">No hay títulos que coincidan con el filtro o la búsqueda.</p>
                ) : (
                  <Shelf
                    items={shownLibrary}
                    onOpen={(id) => openDetail("item", id)}
                    reorderable={categoryFilter === "manga" && !search}
                    onReorder={(ids) => reorderCategory("manga", ids)}
                  />
                ))}
            </>
          )}
      </main>

      <BottomNav view={view} onNavigate={navigate} />

      {itemModal && (
        <ItemModal
          editing={itemModal.editing}
          defaultCategory={itemModal.defaultCategory}
          tcgFolderTarget={itemModal.tcgFolderTarget}
          onClose={() => setItemModal(null)}
          onSave={saveItem}
          onDelete={() => deleteItem(itemModal.editing.id)}
        />
      )}
      {animeModal && (
        <AnimeModal
          editing={animeModal.editing}
          onClose={() => setAnimeModal(null)}
          onSave={saveAnime}
          onDelete={() => deleteAnime(animeModal.editing.id)}
        />
      )}
      {detail && detailRecord && (
        <DetailModal
          kind={detail.kind}
          record={detailRecord}
          onClose={() => setDetail(null)}
          onBump={bump}
          onEdit={() => {
            if (detail.kind === "item") setItemModal({ editing: detailRecord });
            else setAnimeModal({ editing: detailRecord });
            setDetail(null);
          }}
          onDelete={() => (detail.kind === "item" ? deleteItem(detail.id) : deleteAnime(detail.id))}
        />
      )}

      {folderModal && (
        <TcgFolderModal
          game={folderModal.game}
          items={items}
          onExport={exportTcgSet}
          onOpenFolder={openTcgFolder}
          onClose={() => setFolderModal(null)}
        />
      )}

      {steamImportOpen && (
        <SteamImportModal
          existingTitles={new Set(gameItems.map((g) => g.title.toLowerCase().trim()))}
          onClose={() => setSteamImportOpen(false)}
          onImport={importSteamGames}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
