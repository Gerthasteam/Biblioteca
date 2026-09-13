"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Plus, BookOpen, Folder, ChevronLeft, Trash2 } from "lucide-react";
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
  const [toast, setToast] = useState(null);

  const [itemModal, setItemModal] = useState(null); // { editing, defaultCategory } | null
  const [animeModal, setAnimeModal] = useState(null);
  const [detail, setDetail] = useState(null); // { kind, id } | null
  const [folderModal, setFolderModal] = useState(null); // { game } | null
  const [activeTcgFolder, setActiveTcgFolder] = useState(null); // { key, game, setId, setName } | null

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
      const [ir, ar] = await Promise.all([fetch("/api/items"), fetch("/api/animes")]);
      const [ij, aj] = await Promise.all([ir.json(), ar.json()]);
      if (ij.items) setItems(ij.items);
      if (aj.animes) setAnimes(aj.animes);
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

  const tcgFolders = useMemo(() => groupTcgFolders(items), [items]);
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

  function openTcgFolder(folder) {
    setFolderModal(null);
    setCategoryFilter("tcg");
    setActiveTcgFolder(folder);
  }

  // Borra una carpeta TCG entera (todas las cartas de esa expansión) de una.
  async function deleteTcgFolder(folder, ids) {
    if (!ids.length) return;
    const label = folder.setName || "esta carpeta";
    if (!window.confirm(`¿Borrar la carpeta "${label}" y sus ${ids.length} carta${ids.length === 1 ? "" : "s"}? No se puede deshacer.`)) {
      return;
    }
    setItems((prev) => prev.filter((it) => !ids.includes(it.id)));
    if (activeTcgFolder && activeTcgFolder.game === folder.game && activeTcgFolder.setId === folder.setId) {
      setActiveTcgFolder(null);
    }
    try {
      const res = await fetch("/api/items/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids })
      });
      if (!res.ok) throw new Error("error");
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

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <header className="topbar">
          <div className="topbar__brand">
            <div className="topbar__logo">
              <BookOpen size={16} />
            </div>
            <div className="topbar__title">Mi Colección</div>
          </div>
        </header>

        <main className="main">
          {view === "home" && (
            <Home items={items} animes={animes} onNavigate={navigate} onOpen={openDetail} />
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
                        <button
                          type="button"
                          className="btn subtle"
                          onClick={() => deleteTcgFolder(activeTcgFolder, activeFolderItems.map((it) => it.id))}
                        >
                          <Trash2 size={14} />
                          Borrar carpeta
                        </button>
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
                          {formatSetCode(activeTcgFolder.setId) && (
                            <span className="tcg-folder-tile__code"> ({formatSetCode(activeTcgFolder.setId)})</span>
                          )}
                        </h2>
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
                    <p className="empty-note">
                      Todavía no exportaste ninguna expansión — usá el botón de arriba (One Piece).
                    </p>
                  ) : (
                    <div className="tcg-folder-grid">
                      {tcgFolders.map((f) => {
                        const owned = f.items.filter((it) => it.status === "completo").length;
                        const cover = f.items[0]?.coverUrl;
                        return (
                          <div key={f.key} className="tcg-folder-tile">
                            <button
                              type="button"
                              className="tcg-folder-tile__open"
                              onClick={() => setActiveTcgFolder(f)}
                            >
                              {cover ? (
                                <img src={cover} alt="" className="tcg-folder-tile__logo" />
                              ) : (
                                <Folder size={28} />
                              )}
                              <div className="tcg-folder-tile__name">
                                {f.setName}
                                {formatSetCode(f.setId) && (
                                  <span className="tcg-folder-tile__code"> ({formatSetCode(f.setId)})</span>
                                )}
                              </div>
                              <div className="tcg-folder-tile__count">
                                {owned}/{f.items.length} cartas
                              </div>
                            </button>
                            <button
                              type="button"
                              className="tcg-folder-tile__delete"
                              title="Borrar carpeta"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteTcgFolder(f, f.items.map((it) => it.id));
                              }}
                            >
                              <Trash2 size={13} />
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
      </div>

      <BottomNav view={view} onNavigate={navigate} />

      {itemModal && (
        <ItemModal
          editing={itemModal.editing}
          defaultCategory={itemModal.defaultCategory}
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

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
