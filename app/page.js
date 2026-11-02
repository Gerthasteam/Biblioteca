"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Plus, FolderPlus, ChevronLeft, Trash2, Pencil, Sparkles, LogOut, Zap, Layers3 } from "lucide-react";
import AuthScreen from "./components/AuthScreen";
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
import RecommendationModal from "./components/RecommendationModal";
import { TcgLogo, TcgGameTile, TcgAddGameTile, TcgGamePicker, TcgFolderTile } from "./components/TcgGames";
import { CATEGORY_LABEL } from "../lib/ui";
import { groupTcgFolders, parseTcgRef, formatSetCode, withTcgRef } from "../lib/tcgRef";
import { TCG_GAMES, tcgGame } from "../lib/tcgGames";
import { tcgValue, formatUsd, tcgCardKey, tcgQuantity, setMoney, MONEY_MODES } from "../lib/tcgCard";
import TcgCardList from "./components/TcgCardList";
import TcgCardModal from "./components/TcgCardModal";
import TcgSetStats from "./components/TcgSetStats";
import TcgValuePanel from "./components/TcgValuePanel";
import TcgQuickAdd from "./components/TcgQuickAdd";
import TcgPurchasesModal from "./components/TcgPurchasesModal";
import TcgDecks from "./components/TcgDecks";

const EXAMPLE_MANGA = [
  { title: "Vinland Saga", category: "manga", current: 112, total: 220, rating: 5, status: "progreso" },
  { title: "Berserk", category: "manga", current: 41, total: 41, rating: 5, status: "completo" }
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
  tcg: { title: "TCG", tag: "Carpetas de cartas" },
  biblioteca: { title: "Biblioteca", tag: "Todo junto" }
};

export default function App() {
  // undefined = todavía no sabemos si hay sesión, null = no hay sesión
  // (mostrar login), objeto = hay usuario logueado.
  const [user, setUser] = useState(undefined);
  const [view, setView] = useState("home");
  const [categoryFilter, setCategoryFilter] = useState("manga");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState([]);
  const [animes, setAnimes] = useState([]);
  const [customFolders, setCustomFolders] = useState([]); // [{ id, name, game }] — carpetas TCG armadas a mano
  const [tcgGamesAdded, setTcgGamesAdded] = useState([]); // ["onepiece", "pokemon", …] — la grilla de logos
  const [toast, setToast] = useState(null);

  const [itemModal, setItemModal] = useState(null); // { editing, defaultCategory } | null
  const [animeModal, setAnimeModal] = useState(null);
  const [detail, setDetail] = useState(null); // { kind, id } | null
  const [folderModal, setFolderModal] = useState(null); // { game } | null
  const [activeTcgFolder, setActiveTcgFolder] = useState(null); // { key, game, setId, setName } | null
  const [activeTcgGame, setActiveTcgGame] = useState(null); // "onepiece" | "pokemon" | … | null (grilla)
  const [gamePickerOpen, setGamePickerOpen] = useState(false);
  const [tcgCardId, setTcgCardId] = useState(null); // carta TCG abierta en la ventana de detalle
  const [wishlistOpen, setWishlistOpen] = useState(false); // vista "Lista de deseos" dentro de TCG
  const [tcgGameTab, setTcgGameTab] = useState("carpetas"); // dentro de One Piece: "carpetas" | "mazos"
  const [recommendOpen, setRecommendOpen] = useState(false);

  function flashToast(msg) {
    setToast(msg);
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 3500);
  }

  function navigate(next) {
    setView(next);
    setSearch("");
    setCategoryFilter("manga");
    setActiveTcgFolder(null);
    setActiveTcgGame(null);
    setWishlistOpen(false);
  }

  function selectCategoryFilter(c) {
    setCategoryFilter(c);
    setActiveTcgFolder(null);
  }

  async function loadAll() {
    try {
      const [ir, ar, fr, gr] = await Promise.all([
        fetch("/api/items"),
        fetch("/api/animes"),
        fetch("/api/tcg/folders"),
        fetch("/api/tcg/games")
      ]);
      const [ij, aj, fj, gj] = await Promise.all([ir.json(), ar.json(), fr.json(), gr.json().catch(() => ({}))]);
      if (ij.error === "unauthorized" || aj.error === "unauthorized") {
        // La sesión venció mientras estabas usando la app — volvemos a
        // mostrar el login en vez del mensaje de "no hay base conectada".
        setUser(null);
        return;
      }
      if (ij.items) setItems(ij.items);
      if (aj.animes) setAnimes(aj.animes);
      if (fj.folders) setCustomFolders(fj.folders);
      if (gj.games) setTcgGamesAdded(gj.games);
      if (ij.error || aj.error) {
        flashToast("Todavía no conectaste la base de datos — los cambios no se guardan.");
      }
    } catch {
      flashToast("No se pudo conectar con el servidor.");
    }
  }

  // Al entrar a la web, primero nos fijamos si ya hay una sesión activa
  // (cookie). Recién ahí sabemos si mostrar el login o la app.
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((json) => setUser(json.user || null))
      .catch(() => setUser(null));
  }, []);

  // Los datos (manga, anime, TCG) solo se piden una vez que sabemos quién
  // sos — antes de eso pedirlos solo daría 401.
  useEffect(() => {
    if (user) loadAll();
  }, [user]);

  // Botón "atrás" de Android (solo dentro de la app instalada — el APK de
  // Capacitor expone window.Capacitor). Sin esto, atrás cerraba la app
  // entera aunque tuvieras un modal abierto, porque la web no usa el
  // historial del navegador. Va cerrando de a una cosa: modal → carpeta TCG
  // → sección → recién ahí sale de la app.
  useEffect(() => {
    const AppPlugin = typeof window !== "undefined" && window.Capacitor?.Plugins?.App;
    if (!AppPlugin) return;
    const sub = AppPlugin.addListener("backButton", () => {
      if (recommendOpen) setRecommendOpen(false);
      else if (itemModal) setItemModal(null);
      else if (tcgCardId) setTcgCardId(null);
      else if (gamePickerOpen) setGamePickerOpen(false);
      else if (folderModal) setFolderModal(null);
      else if (animeModal) setAnimeModal(null);
      else if (detail) setDetail(null);
      else if (activeTcgFolder) setActiveTcgFolder(null);
      else if (activeTcgGame) setActiveTcgGame(null);
      else if (wishlistOpen) setWishlistOpen(false);
      else if (user && view !== "home") navigate("home");
      else AppPlugin.exitApp();
    });
    return () => {
      Promise.resolve(sub).then((h) => h?.remove?.());
    };
  }, [user, view, recommendOpen, gamePickerOpen, folderModal, itemModal, animeModal, detail, activeTcgFolder, activeTcgGame, tcgCardId, wishlistOpen]);

  function handleAuthed(loggedUser) {
    setUser(loggedUser);
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    // Limpiamos todo lo que estaba en memoria para que la próxima persona
    // que inicie sesión en este mismo navegador no vea ni por un instante
    // la colección de quien cerró sesión.
    setItems([]);
    setAnimes([]);
    setCustomFolders([]);
    setTcgGamesAdded([]);
    setActiveTcgGame(null);
    setView("home");
    setDetail(null);
    setUser(null);
  }

  const mangaItems = useMemo(() => items.filter((i) => i.category === "manga"), [items]);
  const tcgItems = useMemo(() => items.filter((i) => i.category === "tcg"), [items]);

  const filterBySearch = (list, key = "title") =>
    !search ? list : list.filter((r) => r[key].toLowerCase().includes(search.toLowerCase()));

  const shownManga = useMemo(() => filterBySearch(mangaItems), [mangaItems, search]);
  const shownTcg = useMemo(() => filterBySearch(tcgItems), [tcgItems, search]);
  const shownAnimes = useMemo(() => filterBySearch(animes), [animes, search]);
  const shownLibrary = useMemo(() => {
    const list = items.filter((i) => i.category === categoryFilter);
    return filterBySearch(list);
  }, [items, categoryFilter, search]);

  const tcgFolders = useMemo(() => groupTcgFolders(items, customFolders), [items, customFolders]);

  // Juegos de la grilla: los que agregaste a mano + los que ya tienen
  // carpetas (por ejemplo One Piece, que existía antes de esta grilla), en
  // el orden del catálogo.
  const shownTcgGames = useMemo(() => {
    const keys = new Set([...tcgGamesAdded, ...tcgFolders.map((f) => f.group)]);
    return TCG_GAMES.map((g) => g.key).filter((k) => keys.has(k));
  }, [tcgGamesAdded, tcgFolders]);
  const gameFolders = useMemo(
    () => (activeTcgGame ? tcgFolders.filter((f) => f.group === activeTcgGame) : []),
    [tcgFolders, activeTcgGame]
  );

  // Logo y fecha de cada expansión (solo los juegos con API: Pokémon trae
  // las dos cosas, One Piece ninguna). Se pide una vez por juego al entrar.
  const [setMeta, setSetMeta] = useState({}); // { pokemon: { sv3: { logo, releaseDate } } }
  useEffect(() => {
    if (!activeTcgGame || !tcgGame(activeTcgGame).api || setMeta[activeTcgGame]) return;
    const game = activeTcgGame;
    fetch(`/api/tcg/sets?game=${game}`)
      .then((r) => r.json())
      .then((json) => {
        const byId = {};
        for (const s of json.sets || []) byId[s.id] = { logo: s.logo, releaseDate: s.releaseDate };
        if (Object.keys(byId).length) setSetMeta((prev) => ({ ...prev, [game]: byId }));
      })
      .catch(() => {});
  }, [activeTcgGame, setMeta]);

  // Expansiones de la más nueva a la más vieja cuando sabemos la fecha
  // (como en la lista oficial); las que no tienen fecha (carpetas armadas a
  // mano) quedan al final en el orden de siempre.
  const sortedGameFolders = useMemo(() => {
    const meta = setMeta[activeTcgGame] || {};
    const date = (f) => (f.custom ? "" : meta[f.setId]?.releaseDate || "");
    return gameFolders
      .map((f, i) => ({ f, i }))
      .sort((a, b) => date(b.f).localeCompare(date(a.f)) || a.i - b.i)
      .map((x) => x.f);
  }, [gameFolders, setMeta, activeTcgGame]);

  // Precios de mercado (USD) por clave de carta, por juego: { onepiece:
  // { "OP01-001": 0.4, … } }. Se piden al entrar a TCG, solo para los
  // juegos con API (One Piece de una; Pokémon solo los sets que tenés).
  const [tcgPrices, setTcgPrices] = useState({});
  const pricesLoaded = useRef({}); // juego -> qué pedido ya se hizo
  useEffect(() => {
    if (view !== "tcg") return;
    for (const game of shownTcgGames) {
      if (!tcgGame(game).api) continue;
      const sets =
        game === "pokemon"
          ? [...new Set(tcgFolders.filter((f) => f.group === game && !f.custom && f.setId).map((f) => f.setId))].sort().join(",")
          : "";
      if (game === "pokemon" && !sets) continue;
      const key = game + "|" + sets;
      if (pricesLoaded.current[game] === key) continue;
      pricesLoaded.current[game] = key;
      fetch(`/api/tcg/prices?game=${game}${sets ? `&sets=${encodeURIComponent(sets)}` : ""}`)
        .then((r) => r.json())
        .then((json) => {
          if (json.prices && Object.keys(json.prices).length) {
            setTcgPrices((prev) => ({ ...prev, [game]: { ...prev[game], ...json.prices } }));
          } else {
            pricesLoaded.current[game] = null; // falló: se reintenta la próxima vez
          }
        })
        .catch(() => {
          pricesLoaded.current[game] = null;
        });
    }
  }, [view, shownTcgGames, tcgFolders]);

  // Datos de cada carta (número, rareza, color, paralela, precio) de la
  // carpeta abierta, para la vista de lista. Se piden una vez por set.
  const [folderCards, setFolderCards] = useState({}); // { "onepiece:OP-01": { key: card } }
  const folderCardsRequested = useRef(new Set());
  function loadFolderCards(game, setId) {
    if (!game || game === "custom" || !setId || !tcgGame(game).api) return;
    const k = `${game}:${setId}`;
    if (folderCardsRequested.current.has(k)) return;
    folderCardsRequested.current.add(k);
    fetch(`/api/tcg/cards?game=${game}&set=${encodeURIComponent(setId)}`)
      .then((r) => r.json())
      .then((json) => {
        if (!json.cards?.length) {
          folderCardsRequested.current.delete(k); // falló: se reintenta la próxima vez
          return;
        }
        const byKey = {};
        const prices = {};
        for (const c of json.cards) {
          byKey[c.id] = c;
          if (c.price != null) prices[c.id] = c.price;
        }
        setFolderCards((prev) => ({ ...prev, [k]: byKey }));
        setTcgPrices((prev) => ({ ...prev, [game]: { ...prev[game], ...prices } }));
      })
      .catch(() => folderCardsRequested.current.delete(k));
  }
  useEffect(() => {
    if (activeTcgFolder && !activeTcgFolder.custom) loadFolderCards(activeTcgFolder.game, activeTcgFolder.setId);
  }, [activeTcgFolder]);

  // Ventana de detalle de una carta TCG (desde la carpeta, la lista, la
  // búsqueda o la lista de deseos).
  const tcgCardItem = useMemo(() => (tcgCardId ? items.find((it) => it.id === tcgCardId) : null), [tcgCardId, items]);
  function openTcgCard(id) {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    const ref = parseTcgRef(it.notes);
    if (ref) loadFolderCards(ref.game, ref.setId);
    setTcgCardId(id);
  }
  function tcgCardInfo(it) {
    const ref = parseTcgRef(it.notes);
    if (!ref) return null;
    return folderCards[`${ref.game}:${ref.setId}`]?.[tcgCardKey(it)] || null;
  }

  // Estrella de la lista de deseos. Se manda solo "wish" + lo mínimo que
  // pide la ruta, sin pisar nada más de la carta.
  function toggleWish(item) {
    const wish = !item.wish;
    setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, wish } : it)));
    const payload = { ...item, wish };
    delete payload.id;
    delete payload.createdAt;
    fetch(`/api/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(() => flashToast("No se pudo actualizar la lista de deseos."));
  }

  // ---- Carga rápida (One Piece) ----
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  // Copias que tenés por clave de carta y por número (el número junta la
  // normal y sus paralelas — es lo que cuenta para un mazo).
  const onePieceOwned = useMemo(() => {
    const byKey = new Map();
    const byNumber = new Map();
    const itemByKey = new Map();
    for (const it of items) {
      if (it.category !== "tcg") continue;
      const ref = parseTcgRef(it.notes);
      if (!ref || ref.game !== "onepiece") continue;
      const key = tcgCardKey(it);
      itemByKey.set(key, it);
      const q = tcgQuantity(it);
      byKey.set(key, (byKey.get(key) || 0) + q);
      const num = String(key).split("_")[0].toUpperCase();
      byNumber.set(num, (byNumber.get(num) || 0) + q);
    }
    return { byKey, byNumber, itemByKey };
  }, [items]);

  async function quickAddCard(card) {
    const existing = onePieceOwned.itemByKey.get(card.id);
    if (existing) {
      setTcgQuantity(existing, tcgQuantity(existing) + 1);
      flashToast(`${card.title}: ahora tenés ${tcgQuantity(existing) + 1}.`);
      return;
    }
    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: card.title,
          category: "tcg",
          status: "completo",
          unit: "Carta",
          current: 1,
          total: null,
          rating: 0,
          notes: withTcgRef("", "onepiece", card.setId, card.setName, card.id),
          coverUrl: card.cover || null
        })
      });
      const json = await res.json();
      if (!res.ok || !json.item) throw new Error(json.message || "error");
      setItems((prev) => [...prev, json.item]);
      setTcgGamesAdded((prev) => (prev.includes("onepiece") ? prev : [...prev, "onepiece"]));
      flashToast(`Sumaste ${card.title} a ${card.setName}.`);
    } catch (err) {
      flashToast("No se pudo sumar la carta: " + err.message);
    }
  }

  // ---- Moneda: dólares o pesos (con el dólar elegido) ----
  const [moneyMode, setMoneyMode] = useState("usd");
  const [fxRates, setFxRates] = useState({}); // { blue: 1565, tarjeta: 2034.5, … } (venta)
  useEffect(() => {
    try {
      const m = localStorage.getItem("estante.money");
      if (MONEY_MODES.some((x) => x.key === m)) setMoneyMode(m);
    } catch {}
  }, []);
  const fxLoaded = useRef(false);
  useEffect(() => {
    if (view !== "tcg" || fxLoaded.current) return;
    fxLoaded.current = true;
    fetch("/api/fx")
      .then((r) => r.json())
      .then((json) => {
        if (json.rates && Object.keys(json.rates).length) setFxRates(json.rates);
        else fxLoaded.current = false;
      })
      .catch(() => {
        fxLoaded.current = false;
      });
  }, [view]);
  function changeMoneyMode(m) {
    setMoneyMode(m);
    try {
      localStorage.setItem("estante.money", m);
    } catch {}
  }

  // Carpeta o lista: se recuerda en este navegador.
  const [tcgFolderView, setTcgFolderView] = useState("carpeta");
  useEffect(() => {
    try {
      const v = localStorage.getItem("estante.tcgFolderView");
      if (v === "lista" || v === "carpeta" || v === "stats") setTcgFolderView(v);
    } catch {}
  }, []);
  function changeTcgFolderView(v) {
    setTcgFolderView(v);
    try {
      localStorage.setItem("estante.tcgFolderView", v);
    } catch {}
  }

  // ---- Evolución del valor ----
  // Valor en vivo de lo que tenés, por juego (solo los que ya tienen precios).
  const liveTcgValues = useMemo(() => {
    const out = {};
    for (const game of shownTcgGames) {
      if (!tcgPrices[game]) continue;
      const cards = tcgFolders.filter((f) => f.group === game).flatMap((f) => f.items);
      out[game] = Math.round(tcgValue(cards, tcgPrices[game]).owned * 100) / 100;
    }
    return out;
  }, [shownTcgGames, tcgPrices, tcgFolders]);

  const [valueHistory, setValueHistory] = useState([]);
  const historyLoaded = useRef(false);
  useEffect(() => {
    if (view !== "tcg" || historyLoaded.current) return;
    historyLoaded.current = true;
    fetch("/api/tcg/history")
      .then((r) => r.json())
      .then((json) => setValueHistory(json.history || []))
      .catch(() => {
        historyLoaded.current = false;
      });
  }, [view]);

  // Guarda el valor de hoy de cada juego (uno por día; si cambia — sumaste
  // cartas — se pisa). Espera un poco para no mandar uno por cada toque.
  const lastSavedValue = useRef({});
  useEffect(() => {
    const t = setTimeout(() => {
      const day = new Date().toLocaleDateString("en-CA");
      for (const [game, value] of Object.entries(liveTcgValues)) {
        const k = `${day}|${value}`;
        if (lastSavedValue.current[game] === k) continue;
        lastSavedValue.current[game] = k;
        fetch("/api/tcg/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ game, value, day })
        }).catch(() => {
          lastSavedValue.current[game] = null;
        });
      }
    }, 2500);
    return () => clearTimeout(t);
  }, [liveTcgValues]);

  // ---- Compras y ganancia ----
  const [purchases, setPurchases] = useState([]);
  const [purchasesOpen, setPurchasesOpen] = useState(false);
  const purchasesLoaded = useRef(false);
  useEffect(() => {
    if (view !== "tcg" || purchasesLoaded.current) return;
    purchasesLoaded.current = true;
    fetch("/api/tcg/purchases")
      .then((r) => r.json())
      .then((json) => setPurchases(json.purchases || []))
      .catch(() => {
        purchasesLoaded.current = false;
      });
  }, [view]);
  // Lo que pagaste por cartas sueltas (costo por copia × copias), por juego.
  const cardInvested = useMemo(() => {
    const out = {};
    for (const game of shownTcgGames) {
      const cards = tcgFolders.filter((f) => f.group === game).flatMap((f) => f.items);
      const v = tcgValue(cards, tcgPrices[game]).invested;
      if (v > 0) out[game] = v;
    }
    return out;
  }, [shownTcgGames, tcgFolders, tcgPrices]);
  const totalInvested =
    purchases.reduce((n, p) => n + p.amount, 0) + Object.values(cardInvested).reduce((n, v) => n + v, 0);

  async function addPurchase(p) {
    try {
      const res = await fetch("/api/tcg/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p)
      });
      const json = await res.json();
      if (!res.ok || !json.purchase) throw new Error(json.message || "error");
      setPurchases((prev) => [json.purchase, ...prev].sort((a, b) => b.day.localeCompare(a.day)));
      return true;
    } catch (err) {
      flashToast("No se pudo anotar la compra: " + err.message);
      return false;
    }
  }
  function deletePurchase(p) {
    if (!window.confirm(`¿Borrar "${p.description}"?`)) return;
    setPurchases((prev) => prev.filter((x) => x.id !== p.id));
    fetch("/api/tcg/purchases", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id })
    }).catch(() => flashToast("No se pudo borrar la compra en el servidor."));
  }
  // Lo que pagaste por copia de una carta (dólares, o null para borrarlo).
  function setTcgCost(item, cost) {
    setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, cost } : it)));
    const payload = { ...item, cost };
    delete payload.id;
    delete payload.createdAt;
    fetch(`/api/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(() => flashToast("No se pudo guardar lo que pagaste."));
  }

  // ---- Lista de deseos ----
  const wishItems = useMemo(() => items.filter((it) => it.category === "tcg" && it.wish), [items]);
  function tcgItemPrice(it) {
    const ref = parseTcgRef(it.notes);
    const key = tcgCardKey(it);
    return (ref && tcgPrices[ref.game]?.[key]) ?? tcgCardInfo(it)?.price ?? null;
  }
  const wishTotal = useMemo(
    () => wishItems.filter((it) => it.status !== "completo").reduce((n, it) => n + (tcgItemPrice(it) || 0), 0),
    [wishItems, tcgPrices, folderCards]
  );
  // Al abrir la lista se piden los datos de cada set que aparece en ella.
  useEffect(() => {
    if (!wishlistOpen) return;
    for (const it of wishItems) {
      const ref = parseTcgRef(it.notes);
      if (ref) loadFolderCards(ref.game, ref.setId);
    }
  }, [wishlistOpen, wishItems]);

  function gameStats(gameKey) {
    const folders = tcgFolders.filter((f) => f.group === gameKey);
    const cards = folders.flatMap((f) => f.items);
    const owned = cards.filter((it) => it.status === "completo").length;
    if (!folders.length) return "Sin carpetas";
    const value = tcgPrices[gameKey] ? tcgValue(cards, tcgPrices[gameKey]).owned : 0;
    return (
      `${folders.length} carpeta${folders.length === 1 ? "" : "s"} · ${owned}/${cards.length} cartas` +
      (value > 0 ? ` · ${formatUsd(value)}` : "")
    );
  }

  async function addTcgGame(gameKey) {
    setGamePickerOpen(false);
    setTcgGamesAdded((prev) => (prev.includes(gameKey) ? prev : [...prev, gameKey]));
    setActiveTcgGame(gameKey);
    try {
      const res = await fetch("/api/tcg/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game: gameKey })
      });
      if (!res.ok) throw new Error();
    } catch {
      flashToast("No se pudo guardar el juego en el servidor.");
    }
  }

  // Saca un juego de la grilla. Solo si está vacío — para no borrar
  // carpetas enteras sin querer; primero hay que borrar sus carpetas.
  async function removeTcgGame(gameKey) {
    if (tcgFolders.some((f) => f.group === gameKey)) {
      flashToast("Primero borrá las carpetas de este juego.");
      return;
    }
    if (!window.confirm(`¿Quitar ${tcgGame(gameKey).name} de tus TCG?`)) return;
    setTcgGamesAdded((prev) => prev.filter((k) => k !== gameKey));
    setActiveTcgGame(null);
    try {
      await fetch("/api/tcg/games", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game: gameKey })
      });
    } catch {
      flashToast("No se pudo quitar el juego en el servidor.");
    }
  }
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
  // el modal de edición. Prenderla cuenta 1 copia si no tenía cantidad.
  function toggleOwned(item) {
    setTcgQuantity(item, item.status === "completo" ? 0 : Math.max(1, item.current || 0));
  }

  // Cantidad de copias de una carta TCG: se guarda en "current", y tener
  // 0 copias es lo mismo que no tenerla (status pendiente).
  function setTcgQuantity(item, qty) {
    const current = Math.max(0, Math.min(999, qty | 0));
    const status = current > 0 ? "completo" : "pendiente";
    setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, status, current } : it)));
    const payload = { ...item, status, current };
    delete payload.id;
    delete payload.createdAt;
    fetch(`/api/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
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
      setView("tcg");
      setActiveTcgGame(meta.game);
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

  // DESACTIVADO junto con la sección Videojuegos (ver SteamImportModal.js).
  // Para volver: descomentar esto, el import de SteamImportModal y Download,
  // el estado steamImportOpen, el botón y el modal de más abajo.
  //
  // const [steamImportOpen, setSteamImportOpen] = useState(false);
  //
  // // Importar de Steam: la lista ya viene armada (con checkboxes) desde
  // // SteamImportModal, acá solo la mandamos en bloque igual que exportTcgSet.
  // async function importSteamGames(payloadItems) {
  //   try {
  //     const res = await fetch("/api/items/bulk", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ items: payloadItems })
  //     });
  //     const json = await res.json();
  //     if (!res.ok) throw new Error(json.message || "error");
  //     setItems((prev) => [...prev, ...(json.items || [])]);
  //     setSteamImportOpen(false);
  //     flashToast(
  //       json.items.length
  //         ? `Se importaron ${json.items.length} juego${json.items.length === 1 ? "" : "s"} de Steam.`
  //         : "No había juegos nuevos para importar."
  //     );
  //   } catch (err) {
  //     flashToast("No se pudo importar: " + err.message);
  //   }
  // }
  //
  // Botón (iba arriba de la grilla de videojuegos):
  //   <button type="button" className="btn subtle" onClick={() => setSteamImportOpen(true)}>
  //     <Download size={14} /> Importar de Steam
  //   </button>
  //
  // Modal (iba al final, junto a los otros modales):
  //   {steamImportOpen && (
  //     <SteamImportModal
  //       existingTitles={new Set(gameItems.map((g) => g.title.toLowerCase().trim()))}
  //       onClose={() => setSteamImportOpen(false)}
  //       onImport={importSteamGames}
  //     />
  //   )}

  function openTcgFolder(folder) {
    setFolderModal(null);
    setView("tcg");
    setActiveTcgGame(folder.group || folder.game);
    setActiveTcgFolder(folder);
  }

  // Carpeta TCG armada a mano (botón "Nueva carpeta"): no viene de exportar
  // una expansión, así que arranca vacía y se le van agregando cartas.
  async function createCustomFolder(gameKey) {
    const name = window.prompt("Nombre de la carpeta:");
    if (!name || !name.trim()) return;
    try {
      const res = await fetch("/api/tcg/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), game: gameKey })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "error");
      setCustomFolders((prev) => [...prev, json.folder]);
      setView("tcg");
      setActiveTcgFolder({
        key: `custom:${json.folder.id}`,
        game: "custom",
        group: json.folder.game,
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
    else if (view === "tcg") setItemModal({ editing: null, defaultCategory: "tcg" });
    else if (view === "biblioteca") setItemModal({ editing: null, defaultCategory: categoryFilter });
    else setItemModal({ editing: null, defaultCategory: "manga" });
  }

  // Todos los precios de este render se muestran en la moneda elegida (si
  // todavía no llegó la cotización, en dólares).
  setMoney(moneyMode, fxRates[moneyMode]);

  const meta = VIEW_META[view];

  // Todavía no sabemos si hay sesión (primer render) — no mostramos ni el
  // login ni la app hasta tener la respuesta, para evitar un parpadeo.
  if (user === undefined) {
    return <div className="auth-loading" />;
  }

  if (user === null) {
    return <AuthScreen onAuthed={handleAuthed} />;
  }

  return (
    <div className="app-shell">
      <Sidebar view={view} onNavigate={navigate} user={user} onLogout={handleLogout} />

      <header className="topbar">
        <div className="topbar__brand">
          <div className="topbar__logo">
            <img src="/mascot-icon.png" alt="" />
          </div>
          <div className="topbar__title">Mi Colección</div>
        </div>
        <button type="button" className="icon-btn" aria-label="Cerrar sesión" onClick={handleLogout}>
          <LogOut size={16} />
        </button>
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
                    ["manga", "otro"].map((c) => (
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

              {view === "tcg" && activeTcgGame && !activeTcgFolder && !search && !(activeTcgGame === "onepiece" && tcgGameTab === "mazos") && (
                <div className="tcg-game-row">
                  <button type="button" className="btn subtle" onClick={() => setActiveTcgGame(null)}>
                    <ChevronLeft size={14} />
                    Mis TCG
                  </button>
                  {activeTcgGame === "onepiece" && (
                    <button type="button" className="btn" onClick={() => setQuickAddOpen(true)}>
                      <Zap size={14} />
                      Carga rápida
                    </button>
                  )}
                  {tcgGame(activeTcgGame).api && (
                    <button type="button" className="btn subtle" onClick={() => setFolderModal({ game: activeTcgGame })}>
                      <Plus size={14} />
                      Agregar expansión
                    </button>
                  )}
                  <button type="button" className="btn subtle" onClick={() => createCustomFolder(activeTcgGame)}>
                    <FolderPlus size={14} />
                    Nueva carpeta
                  </button>
                  {gameFolders.length === 0 && (
                    <button type="button" className="btn subtle" onClick={() => removeTcgGame(activeTcgGame)}>
                      <Trash2 size={14} />
                      Quitar juego
                    </button>
                  )}
                </div>
              )}

              {((view === "manga" && !search && mangaItems.length > 1) ||
                (view === "biblioteca" && categoryFilter === "manga" && !search && mangaItems.length > 1)) && (
                <p className="section-header__sub" style={{ marginTop: -10, marginBottom: 14 }}>
                  Mantené apretado un manga (click o dedo) y arrastralo para reordenarlo.
                </p>
              )}

              {view === "tcg" && activeTcgFolder && !search && activeFolderItems.length > 1 && tcgFolderView === "carpeta" && (
                <p className="section-header__sub" style={{ marginTop: -10, marginBottom: 14 }}>
                  Mantené apretada una carta (click o dedo) y arrastrala para reordenarla.
                </p>
              )}

              {view === "manga" && (
                <div className="tcg-game-row">
                  <button type="button" className="btn subtle" onClick={() => setRecommendOpen(true)}>
                    <Sparkles size={14} />
                    Recomendación
                  </button>
                </div>
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

              {view === "tcg" && (
                <>
                  {search ? (
                    shownTcg.length === 0 ? (
                      <p className="empty-note">No hay cartas que coincidan con la búsqueda.</p>
                    ) : (
                      <Binder items={shownTcg} onToggleOwned={toggleOwned} onEdit={openTcgCard} />
                    )
                  ) : activeTcgFolder ? (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                        <button type="button" className="btn subtle" onClick={() => setActiveTcgFolder(null)}>
                          <ChevronLeft size={14} />
                          {activeTcgGame ? tcgGame(activeTcgGame).name : "Mis carpetas"}
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
                          {activeTcgFolder.game === "onepiece" && (
                            <button type="button" className="btn subtle" onClick={() => setQuickAddOpen(true)}>
                              <Zap size={14} />
                              Carga rápida
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
                      {activeFolderItems.length > 0 && (() => {
                        const owned = activeFolderItems.filter((it) => it.status === "completo").length;
                        const pct = Math.round((owned / activeFolderItems.length) * 100);
                        const value = tcgValue(activeFolderItems, tcgPrices[activeTcgFolder.game]);
                        const hasPrices = value.owned > 0 || value.missing > 0;
                        return (
                          <div className="tcg-folder-stats">
                            <div className="tcg-folder-stats__item">
                              <b>{owned}/{activeFolderItems.length}</b>
                              <span>cartas · {pct}%</span>
                            </div>
                            {hasPrices && (
                              <>
                                <div className="tcg-folder-stats__item">
                                  <b>{formatUsd(value.owned)}</b>
                                  <span>lo que tenés</span>
                                </div>
                                <div className="tcg-folder-stats__item">
                                  <b>{formatUsd(value.missing)}</b>
                                  <span>lo que falta</span>
                                </div>
                              </>
                            )}
                            <div className="tcg-view-toggle" role="tablist">
                              {[
                                ["carpeta", "Carpeta"],
                                ["lista", "Lista"],
                                ["stats", "Estadísticas"]
                              ].map(([v, label]) => (
                                <button
                                  key={v}
                                  type="button"
                                  role="tab"
                                  aria-selected={tcgFolderView === v}
                                  className={tcgFolderView === v ? "active" : ""}
                                  onClick={() => changeTcgFolderView(v)}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                      {shownFolderItems.length === 0 ? (
                        <p className="empty-note">Esta carpeta todavía no tiene cartas.</p>
                      ) : tcgFolderView === "stats" ? (
                        <TcgSetStats
                          items={activeFolderItems}
                          info={folderCards[`${activeTcgFolder.game}:${activeTcgFolder.setId}`]}
                          prices={tcgPrices[activeTcgFolder.game]}
                          onOpen={openTcgCard}
                        />
                      ) : tcgFolderView === "lista" ? (
                        <TcgCardList
                          items={shownFolderItems}
                          info={folderCards[`${activeTcgFolder.game}:${activeTcgFolder.setId}`]}
                          prices={tcgPrices[activeTcgFolder.game]}
                          onToggleOwned={toggleOwned}
                          onSetQuantity={setTcgQuantity}
                          onToggleWish={toggleWish}
                          onOpen={openTcgCard}
                        />
                      ) : (
                        <Binder
                          items={shownFolderItems}
                          onToggleOwned={toggleOwned}
                          onEdit={openTcgCard}
                          reorderable
                          onReorder={(ids) => reorderTcgFolder(activeTcgFolder, ids)}
                        />
                      )}
                    </>
                  ) : wishlistOpen ? (
                    <>
                      <div className="tcg-game-row">
                        <button type="button" className="btn subtle" onClick={() => setWishlistOpen(false)}>
                          <ChevronLeft size={14} />
                          Mis TCG
                        </button>
                      </div>
                      <div className="tcg-folder-stats">
                        <div className="tcg-folder-stats__item">
                          <b>{wishItems.length}</b>
                          <span>en tu lista de deseos</span>
                        </div>
                        {wishTotal > 0 && (
                          <div className="tcg-folder-stats__item">
                            <b>{formatUsd(wishTotal)}</b>
                            <span>lo que necesitás para las que te faltan</span>
                          </div>
                        )}
                      </div>
                      {wishItems.length === 0 ? (
                        <div className="empty-note empty-note--mascot">
                          <img src="/mascot.png" alt="" />
                          <p>
                            Todavía no marcaste ninguna carta — tocá la ★ de una carta en la vista de lista o en su
                            detalle para sumarla acá.
                          </p>
                        </div>
                      ) : (
                        <TcgCardList
                          items={wishItems}
                          info={tcgCardInfo}
                          prices={tcgItemPrice}
                          showSet
                          defaultStatus="faltan"
                          onToggleOwned={toggleOwned}
                          onSetQuantity={setTcgQuantity}
                          onToggleWish={toggleWish}
                          onOpen={openTcgCard}
                        />
                      )}
                    </>
                  ) : !activeTcgGame ? (
                    <>
                      {shownTcgGames.length > 0 && (
                        <TcgValuePanel
                          history={valueHistory}
                          live={liveTcgValues}
                          wishCount={wishItems.length}
                          wishTotal={wishTotal}
                          onOpenWishlist={() => setWishlistOpen(true)}
                          moneyMode={moneyMode}
                          onMoneyMode={changeMoneyMode}
                          rates={fxRates}
                          invested={totalInvested}
                          onOpenPurchases={() => setPurchasesOpen(true)}
                        />
                      )}
                      {shownTcgGames.length === 0 && (
                        <div className="empty-note empty-note--mascot" style={{ marginBottom: 18 }}>
                          <img src="/mascot.png" alt="" />
                          <p>Todavía no agregaste ningún juego — tocá "Agregar juego" para empezar.</p>
                        </div>
                      )}
                      <div className="tcg-game-grid">
                        {shownTcgGames.map((k) => (
                          <TcgGameTile key={k} gameKey={k} meta={gameStats(k)} onClick={() => setActiveTcgGame(k)} />
                        ))}
                        <TcgAddGameTile onClick={() => setGamePickerOpen(true)} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="tcg-game-header">
                        <TcgLogo gameKey={activeTcgGame} small />
                      </div>
                      {activeTcgGame === "onepiece" && (
                        <div className="tcg-game-tabs" role="tablist">
                          {[
                            ["carpetas", "Carpetas"],
                            ["mazos", "Mazos"]
                          ].map(([k, label]) => (
                            <button
                              key={k}
                              type="button"
                              role="tab"
                              aria-selected={tcgGameTab === k}
                              className={tcgGameTab === k ? "active" : ""}
                              onClick={() => setTcgGameTab(k)}
                            >
                              {k === "mazos" && <Layers3 size={14} />}
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                      {activeTcgGame === "onepiece" && tcgGameTab === "mazos" ? (
                        <TcgDecks
                          ownedByNumber={onePieceOwned.byNumber}
                          onToast={flashToast}
                          onBack={() => setActiveTcgGame(null)}
                        />
                      ) : gameFolders.length === 0 ? (
                        <div className="empty-note empty-note--mascot">
                          <img src="/mascot.png" alt="" />
                          <p>
                            {tcgGame(activeTcgGame).api
                              ? `Todavía no tenés carpetas de ${tcgGame(activeTcgGame).name} — tocá "Agregar expansión" para exportar un set completo, o armá una a mano con "Nueva carpeta".`
                              : `Todavía no tenés carpetas de ${tcgGame(activeTcgGame).name} — creá una con "Nueva carpeta" y andá cargando tus cartas.`}
                          </p>
                        </div>
                      ) : (
                        <div className="tcg-set-grid">
                          {sortedGameFolders.map((f) => (
                            <TcgFolderTile
                              key={f.key}
                              folder={f}
                              gameKey={activeTcgGame}
                              meta={setMeta[activeTcgGame]?.[f.setId]}
                              prices={tcgPrices[activeTcgGame]}
                              onOpen={() => setActiveTcgFolder(f)}
                              onDelete={() => deleteTcgFolder(f, f.items.map((it) => it.id))}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {view === "biblioteca" &&
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

      {purchasesOpen && (
        <TcgPurchasesModal
          purchases={purchases}
          games={shownTcgGames.length ? shownTcgGames : ["onepiece"]}
          values={liveTcgValues}
          cardInvested={cardInvested}
          onAdd={addPurchase}
          onDelete={deletePurchase}
          onClose={() => setPurchasesOpen(false)}
        />
      )}

      {quickAddOpen && (
        <TcgQuickAdd
          ownedQty={(key) => onePieceOwned.byKey.get(key) || 0}
          onAdd={quickAddCard}
          onClose={() => setQuickAddOpen(false)}
        />
      )}

      {tcgCardItem && (
        <TcgCardModal
          item={tcgCardItem}
          card={tcgCardInfo(tcgCardItem)}
          price={tcgPrices[parseTcgRef(tcgCardItem.notes)?.game]?.[tcgCardKey(tcgCardItem)] ?? tcgCardInfo(tcgCardItem)?.price ?? null}
          onClose={() => setTcgCardId(null)}
          onSetQuantity={setTcgQuantity}
          onToggleWish={toggleWish}
          onSetCost={setTcgCost}
          onEdit={() => {
            setItemModal({ editing: tcgCardItem });
            setTcgCardId(null);
          }}
          onDelete={() => {
            if (!window.confirm(`¿Borrar "${tcgCardItem.title}"?`)) return;
            setTcgCardId(null);
            deleteItem(tcgCardItem.id);
          }}
        />
      )}

      {gamePickerOpen && (
        <TcgGamePicker added={shownTcgGames} onPick={addTcgGame} onClose={() => setGamePickerOpen(false)} />
      )}

      {recommendOpen && (
        <RecommendationModal mangaItems={mangaItems} onClose={() => setRecommendOpen(false)} />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
