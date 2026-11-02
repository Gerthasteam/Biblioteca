"use client";

import { useEffect, useState } from "react";
import { Copy, Link2, Link2Off, ExternalLink } from "lucide-react";

// Compartir la colección de manga con un link público de solo lectura.
export default function ShareModal({ onClose, onToast }) {
  const [token, setToken] = useState(undefined); // undefined = cargando
  const [busy, setBusy] = useState(false);
  const url = token ? `${window.location.origin}/c/${token}` : "";

  useEffect(() => {
    fetch("/api/share")
      .then((r) => r.json())
      .then((j) => setToken(j.token || null))
      .catch(() => setToken(null));
  }, []);

  async function call(method) {
    setBusy(true);
    try {
      const r = await fetch("/api/share", { method });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || "error");
      setToken(method === "DELETE" ? null : j.token);
    } catch (err) {
      onToast("No se pudo: " + err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>Compartir colección</h2>
        <p className="section-header__sub" style={{ marginTop: -8 }}>
          Un link de solo lectura con tus series de manga, sus tomos, puntajes y reseñas. No muestra tu mail. Lo podés
          desactivar cuando quieras.
        </p>
        {token === undefined ? (
          <p className="section-header__sub">Cargando…</p>
        ) : token ? (
          <>
            <div className="share-link">
              <input type="text" readOnly value={url} onFocus={(e) => e.target.select()} />
              <button
                type="button"
                className="btn"
                onClick={() =>
                  navigator.clipboard?.writeText(url).then(
                    () => onToast("Link copiado."),
                    () => window.prompt("Copiá el link:", url)
                  )
                }
              >
                <Copy size={14} />
                Copiar
              </button>
            </div>
            <div className="modal__actions">
              <button type="button" className="btn subtle" disabled={busy} onClick={() => call("DELETE")}>
                <Link2Off size={14} />
                Desactivar link
              </button>
              <div className="modal__actions-right">
                <a className="btn subtle" href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={14} />
                  Ver
                </a>
                <button type="button" className="btn" onClick={onClose}>
                  Listo
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="modal__actions">
            <button type="button" className="btn subtle" onClick={onClose}>
              Cancelar
            </button>
            <button type="button" className="btn" disabled={busy} onClick={() => call("POST")}>
              <Link2 size={14} />
              Crear link
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
