"use client";

import { Home, BookOpen, Tv, Gamepad2, Library } from "lucide-react";

export const NAV_ITEMS = [
  { key: "home", label: "Inicio", icon: Home },
  { key: "manga", label: "Manga", icon: BookOpen },
  { key: "anime", label: "Anime", icon: Tv },
  { key: "videojuego", label: "Videojuegos", icon: Gamepad2 },
  { key: "biblioteca", label: "Biblioteca", icon: Library }
];

export default function Sidebar({ view, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__logo">
          <img src="/mascot-icon.png" alt="" />
        </div>
        <div>
          <div className="sidebar__brand-title">Mi Colección</div>
          <div className="sidebar__brand-tag">Manga · Anime · Videojuegos</div>
        </div>
      </div>

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
    </aside>
  );
}
