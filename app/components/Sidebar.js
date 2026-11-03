"use client";

import { Home, BookOpen, Tv, Layers, Library, Search, CircleUserRound } from "lucide-react";

export const NAV_ITEMS = [
  { key: "home", label: "Inicio", icon: Home },
  { key: "manga", label: "Manga", icon: BookOpen },
  { key: "anime", label: "Anime", icon: Tv },
  { key: "tcg", label: "TCG", icon: Layers },
  { key: "biblioteca", label: "Biblioteca", icon: Library }
];

export default function Sidebar({ view, onNavigate, user, onOpenAccount, onSearch }) {
  return (
    <header className="sidebar">
      <div className="sidebar__inner">
        <button type="button" className="sidebar__brand" onClick={() => onNavigate("home")}>
          <img className="sidebar__brand-icon" src="/mascot-icon.png" alt="" />
          <div>
            <div className="sidebar__brand-title">
              Mi <span>Colección</span>
            </div>
            <div className="sidebar__brand-tag">Manga · Anime · TCG</div>
          </div>
        </button>

        <nav className="nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                className={"nav__item" + (view === item.key ? " active" : "")}
                onClick={() => onNavigate(item.key)}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {user && (
          <div className="sidebar__user">
            <button type="button" className="icon-btn" aria-label="Buscar (Ctrl+K)" title="Buscar (Ctrl+K)" onClick={onSearch}>
              <Search size={16} />
            </button>
            <button type="button" className="sidebar__account" onClick={onOpenAccount} title="Tu cuenta, backup e instalar la app">
              <span className="sidebar__user-email">{user.email}</span>
              <CircleUserRound size={18} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
