import { useState } from "react";
import Icon from "./Icon";

export default function Topbar({ currentTeacher, onLogout, onToggleMobileNav, setActivePage }) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <header className="topbar">
      <div style={{ alignItems: "center", display: "flex", gap: 8 }}>
        <button
          aria-label="Menüyü aç"
          className="sidenav-toggle"
          onClick={onToggleMobileNav}
          type="button"
        >
          <Icon name="menu" />
        </button>
        <div className="product-title">Teacher AI</div>
      </div>
      <div />
      <div className="topbar-actions user-menu-wrap">
        <button
          className="user-menu-trigger"
          onClick={() => setIsUserMenuOpen((current) => !current)}
          type="button"
        >
          <span>{currentTeacher.full_name}</span>
          <span className="avatar">{currentTeacher.full_name.slice(0, 1)}</span>
          <Icon name="expand_more" />
        </button>
        {isUserMenuOpen && (
          <div className="user-dropdown">
            <button
              onClick={() => {
                setActivePage("profile");
                setIsUserMenuOpen(false);
              }}
              type="button"
            >
              <Icon name="person" /> Profil
            </button>
            <button onClick={onLogout} type="button">
              <Icon name="logout" /> Çıkış Yap
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
