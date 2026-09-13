"use client";

import { NAV_ITEMS } from "./Sidebar";

export default function BottomNav({ view, onNavigate }) {
  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            type="button"
            className={"bottom-nav__item" + (view === item.key ? " active" : "")}
            onClick={() => onNavigate(item.key)}
          >
            <Icon size={19} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
