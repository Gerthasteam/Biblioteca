"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Image as ImageIcon, Shuffle } from "lucide-react";
import { CATEGORY_LABEL, SPINE_PALETTE, hashString } from "../../lib/ui";

const SCOPES = ["todo", "manga", "anime", "videojuego", "tcg"];
const SCOPE_LABEL = { todo: "Todo", ...CATEGORY_LABEL, anime: "Anime" };
const COUNTS = [12, 20, 30];

// Arma un collage con las portadas de tu colección y lo deja listo para
// descargar como PNG (útil para compartir en redes). Todo pasa en el
// navegador del usuario con un <canvas> — no se sube nada a ningún lado.
export default function ShelfImageModal({ items, animes, onClose }) {
  const canvasRef = useRef(null);
  const [scope, setScope] = useState("todo");
  const [sortBy, setSortBy] = useState("recientes");
  const [count, setCount] = useState(20);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);

  const combined = useMemo(() => {
    const fromItems = items.map((it) => ({
      title: it.title,
      coverUrl: it.coverUrl,
      category: it.category,
      rating: it.rating || 0,
      createdAt: it.createdAt
    }));
    const fromAnimes = animes.map((a) => ({
      title: a.title,
      coverUrl: a.coverUrl,
      category: "anime",
      rating: a.rating || 0,
      createdAt: a.createdAt
    }));
    return [...fromItems, ...fromAnimes];
  }, [items, animes]);

  const list = useMemo(() => {
    let pool = scope === "todo" ? combined : combined.filter((r) => r.category === scope);
    if (sortBy === "recientes") {
      pool = [...pool].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else if (sortBy === "puntaje") {
      pool = [...pool].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else {
      // al azar — shuffleSeed solo está para forzar un nuevo orden al tocar "Mezclar"
      pool = [...pool]
        .map((r) => [Math.random(), r])
        .sort((a, b) => a[0] - b[0])
        .map(([, r]) => r);
    }
    return pool.slice(0, count);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combined, scope, sortBy, count, shuffleSeed]);

  // Cada vez que cambian los filtros invalidamos la imagen ya generada, así
  // no queda una preview vieja dando vueltas.
  useEffect(() => {
    setImageUrl(null);
  }, [scope, sortBy, count, shuffleSeed]);

  function loadImg(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawCover(ctx, img, x, y, w, h) {
    const ir = img.width / img.height;
    const r = w / h;
    let sx, sy, sw, sh;
    if (ir > r) {
      sh = img.height;
      sw = sh * r;
      sx = (img.width - sw) / 2;
      sy = 0;
    } else {
      sw = img.width;
      sh = sw / r;
      sx = 0;
      sy = (img.height - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }

  async function generate() {
    if (!list.length) return;
    setGenerating(true);
    setError(null);
    try {
      const imgs = await Promise.all(list.map((r) => (r.coverUrl ? loadImg(r.coverUrl) : Promise.resolve(null))));
      const canvas = canvasRef.current;
      const W = 1080;
      const H = 1080;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");

      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, "#181a24");
      bg.addColorStop(1, "#0c0d12");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = "#ffffff";
      ctx.font = "700 42px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText("MI ESTANTE", 48, 74);
      ctx.fillStyle = "#9a9db2";
      ctx.font = "500 22px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText(`${list.length} títulos · ${SCOPE_LABEL[scope]}`, 48, 108);

      const top = 150;
      const bottom = 40;
      const side = 48;
      const gap = 14;
      const cols = count <= 20 ? 4 : 5;
      const rows = Math.ceil(list.length / cols);
      const cellW = (W - side * 2 - gap * (cols - 1)) / cols;
      const cellH = (H - top - bottom - gap * (rows - 1)) / rows;

      list.forEach((r, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = side + col * (cellW + gap);
        const y = top + row * (cellH + gap);
        ctx.save();
        roundRect(ctx, x, y, cellW, cellH, 12);
        ctx.clip();
        const img = imgs[i];
        if (img) {
          drawCover(ctx, img, x, y, cellW, cellH);
        } else {
          ctx.fillStyle = SPINE_PALETTE[hashString(r.title || "x") % SPINE_PALETTE.length];
          ctx.fillRect(x, y, cellW, cellH);
        }
        ctx.restore();
      });

      setImageUrl(canvas.toDataURL("image/png"));
    } catch {
      setError("No se pudo generar la imagen — puede ser por una portada que bloquea la descarga. Probá de nuevo.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <h2>Imagen de tu estante</h2>
        <p className="section-header__sub" style={{ marginTop: -8 }}>
          Armamos un collage con las portadas de tu colección, listo para descargar y compartir.
        </p>

        <div className="field">
          <label>Qué incluir</label>
          <div className="pill-group">
            {SCOPES.map((s) => (
              <button key={s} type="button" className={scope === s ? "active" : ""} onClick={() => setScope(s)}>
                {SCOPE_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Orden</label>
          <div className="pill-group">
            {[
              ["recientes", "Recientes"],
              ["puntaje", "Mejor puntuados"],
              ["azar", "Al azar"]
            ].map(([v, label]) => (
              <button key={v} type="button" className={sortBy === v ? "active" : ""} onClick={() => setSortBy(v)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Cantidad</label>
          <div className="pill-group">
            {COUNTS.map((c) => (
              <button key={c} type="button" className={count === c ? "active" : ""} onClick={() => setCount(c)}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {list.length === 0 && <div className="search-picker__empty">No hay nada para mostrar con estos filtros.</div>}
        {error && <div className="search-picker__empty">{error}</div>}

        {imageUrl && (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <img src={imageUrl} alt="Collage de tu estante" style={{ width: "100%", maxWidth: 320, borderRadius: 12 }} />
          </div>
        )}

        <canvas ref={canvasRef} style={{ display: "none" }} />

        <div className="modal__actions">
          <button type="button" className="btn subtle" onClick={onClose}>
            Cerrar
          </button>
          <div className="modal__actions-right">
            {sortBy === "azar" && imageUrl && (
              <button type="button" className="btn subtle" onClick={() => setShuffleSeed((n) => n + 1)}>
                <Shuffle size={14} />
                Mezclar
              </button>
            )}
            {!imageUrl ? (
              <button type="button" className="btn" disabled={generating || list.length === 0} onClick={generate}>
                <ImageIcon size={14} />
                {generating ? "Generando…" : "Generar imagen"}
              </button>
            ) : (
              <a href={imageUrl} download="mi-estante.png" className="btn">
                Descargar imagen
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
