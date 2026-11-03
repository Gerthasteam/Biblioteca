"use client";

import { useRef, useState } from "react";
import { Download, Upload, FileSpreadsheet, Smartphone, LogOut, Search } from "lucide-react";
import { SERIES_STATUS_LABEL } from "../../lib/manga";
import { ITEM_STATUS_LABEL, ANIME_STATUS_LABEL } from "../../lib/ui";

function csvCell(v) {
  const s = v == null ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function download(name, text, type) {
  const blob = new Blob([text], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 500);
}

// Menú de la cuenta: buscar, backup (JSON) y restaurar, exportar a CSV (para
// abrir en Excel o Google Sheets), instalar la app y cerrar sesión.
export default function AccountMenu({ user, items, animes, installPrompt, onInstall, onSearch, onRestored, onLogout, onClose, onToast }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const isIOS = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = typeof window !== "undefined" && window.matchMedia?.("(display-mode: standalone)").matches;

  function exportCsv() {
    const header = ["Tipo", "Título", "Estado", "Progreso", "Total", "Puntaje", "Editorial", "Tomos que tenés", "Tomos leídos", "Tomos publicados", "Estado de la serie", "Notas"];
    const rows = [
      ...items
        .filter((it) => it.category !== "videojuego")
        .map((it) => {
          const m = it.meta || {};
          return [
            it.category === "manga" ? "Manga" : it.category === "tcg" ? "Carta TCG" : "Otro",
            it.title,
            ITEM_STATUS_LABEL[it.status] || it.status,
            it.current,
            it.total ?? "",
            it.rating || "",
            m.publisher || "",
            (m.owned || []).length || "",
            Object.keys(m.read || {}).length || "",
            m.published || "",
            SERIES_STATUS_LABEL[m.seriesStatus] || "",
            (it.notes || "").replace(/#tcgref:\S+/, "").trim()
          ];
        }),
      ...animes.map((a) => ["Anime", a.title, ANIME_STATUS_LABEL[a.status] || a.status, a.current, a.total ?? "", a.rating || "", "", "", "", "", "", a.notes || ""])
    ];
    // ";" como separador y BOM: así Excel en castellano lo abre bien de una
    const text = "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(";")).join("\r\n");
    download(`mi-estante-${new Date().toLocaleDateString("en-CA")}.csv`, text, "text/csv;charset=utf-8");
    onToast("CSV descargado.");
  }

  async function restore(file) {
    if (!file) return;
    let data;
    try {
      data = JSON.parse(await file.text());
    } catch {
      onToast("Ese archivo no es un backup válido.");
      return;
    }
    if (data?.app !== "mi-estante") {
      onToast("Ese archivo no es un backup de Mi Estante.");
      return;
    }
    const n = (data.items || []).length + (data.animes || []).length;
    if (
      !window.confirm(
        `Restaurar el backup del ${new Date(data.exportedAt).toLocaleDateString("es-AR")} (${n} títulos y cartas) va a REEMPLAZAR toda tu colección actual. ¿Seguir?`
      )
    )
      return;
    setBusy(true);
    try {
      const r = await fetch("/api/backup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || "error");
      onToast("Backup restaurado.");
      onRestored();
    } catch (err) {
      onToast("No se pudo restaurar: " + err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal account-menu">
        <h2>Tu cuenta</h2>
        <p className="section-header__sub" style={{ marginTop: -8 }}>
          {user?.email}
        </p>
        <button type="button" className="account-menu__item" onClick={onSearch}>
          <Search size={16} />
          <span>
            <b>Buscar en toda la colección</b>
            <small>También con Ctrl + K</small>
          </span>
        </button>
        <a className="account-menu__item" href="/api/backup" download>
          <Download size={16} />
          <span>
            <b>Descargar backup</b>
            <small>Toda tu colección en un archivo, para guardarlo por las dudas</small>
          </span>
        </a>
        <button type="button" className="account-menu__item" onClick={() => fileRef.current?.click()} disabled={busy}>
          <Upload size={16} />
          <span>
            <b>{busy ? "Restaurando…" : "Restaurar backup"}</b>
            <small>Reemplaza tu colección actual por la del archivo</small>
          </span>
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => restore(e.target.files?.[0])} />
        <button type="button" className="account-menu__item" onClick={exportCsv}>
          <FileSpreadsheet size={16} />
          <span>
            <b>Exportar a planilla (CSV)</b>
            <small>Para abrir en Excel o Google Sheets</small>
          </span>
        </button>
        {!standalone && (installPrompt || isIOS) && (
          <button
            type="button"
            className="account-menu__item"
            onClick={() => (installPrompt ? onInstall() : window.alert('En el iPhone: tocá Compartir y después "Agregar a pantalla de inicio".'))}
          >
            <Smartphone size={16} />
            <span>
              <b>Instalar la app</b>
              <small>Con ícono en tu pantalla de inicio, sin barra del navegador</small>
            </span>
          </button>
        )}
        <button type="button" className="account-menu__item" onClick={onLogout}>
          <LogOut size={16} />
          <span>
            <b>Cerrar sesión</b>
          </span>
        </button>
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
