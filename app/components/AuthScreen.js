"use client";

import { useState } from "react";

// Pantalla de login/registro — se muestra en vez de la app entera cuando
// todavía no hay una sesión activa. La primera cuenta que se registra en
// toda la app "adopta" automáticamente la colección que ya estaba cargada
// (lo resuelve el server en /api/auth/register), así que Laceiras solo
// necesita registrarse una vez para no perder nada.
export default function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");

    if (mode === "register" && password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${mode === "login" ? "login" : "register"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.message || "Algo salió mal, probá de nuevo.");
        setLoading(false);
        return;
      }
      onAuthed(json.user);
    } catch {
      setError("No se pudo conectar con el servidor.");
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <img className="auth-card__mascot" src="/mascot.png" alt="" />
        <h1>Mi Colección</h1>
        <p className="auth-card__sub">
          {mode === "login" ? "Iniciá sesión para ver tu estante." : "Creá tu cuenta para armar tu propio estante."}
        </p>

        <form onSubmit={submit} className="auth-form">
          <div className="field">
            <label htmlFor="authEmail">Mail</label>
            <input
              id="authEmail"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="authPassword">Contraseña</label>
            <input
              id="authPassword"
              type="password"
              required
              minLength={6}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {mode === "register" && (
            <div className="field">
              <label htmlFor="authConfirm">Repetí la contraseña</label>
              <input
                id="authConfirm"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
          )}

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="btn" disabled={loading} style={{ justifyContent: "center" }}>
            {loading ? "Un segundo…" : mode === "login" ? "Entrar" : "Crear cuenta"}
          </button>
        </form>

        <button
          type="button"
          className="btn subtle auth-switch"
          onClick={() => {
            setMode((m) => (m === "login" ? "register" : "login"));
            setError("");
          }}
        >
          {mode === "login" ? "¿No tenés cuenta? Registrate" : "¿Ya tenés cuenta? Iniciá sesión"}
        </button>
      </div>
    </div>
  );
}
