import { useState } from "react";
import Icon from "./Icon";
import { initialsOf } from "../utils/helpers";

export default function Topbar({ currentTeacher, onLogout, onToggleMobileNav, setActivePage }) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [firstName = "", lastName = ""] = currentTeacher.full_name.split(" ");

  return (
    <header className="topbar sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-outline-variant bg-surface px-4 md:pl-[264px] md:pr-8">
      <div className="flex items-center gap-4">
        <button
          aria-label="Menüyü aç"
          className="text-secondary md:hidden"
          onClick={onToggleMobileNav}
          type="button"
        >
          <Icon name="menu" />
        </button>
        <div className="relative hidden w-64 sm:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant">
            search
          </span>
          <input
            className="w-full rounded-full border border-transparent bg-surface-container-low py-1.5 pl-10 pr-4 font-body-md text-body-md text-on-surface outline-none transition-colors focus:border-primary focus:bg-surface focus:ring-0"
            placeholder="Ara..."
            type="text"
          />
        </div>
      </div>
      <div className="relative flex items-center gap-4">
        <button
          className="hidden font-label-md text-label-md text-on-surface-variant transition-colors hover:text-primary sm:inline"
          onClick={() => setActivePage("profile")}
          type="button"
        >
          Profil
        </button>
        <button
          className="hidden font-label-md text-label-md text-on-surface-variant transition-colors hover:text-primary sm:inline"
          onClick={onLogout}
          type="button"
        >
          Çıkış Yap
        </button>
        <button
          className="flex items-center gap-2"
          onClick={() => setIsUserMenuOpen((current) => !current)}
          type="button"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant bg-primary-container font-label-md text-label-md text-on-primary">
            {initialsOf(firstName, lastName)}
          </span>
          <Icon name="expand_more" className="hidden sm:inline" />
        </button>
        {isUserMenuOpen && (
          <div className="absolute right-0 top-12 z-30 flex w-44 flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05)]">
            <button
              className="flex items-center gap-2 px-4 py-2.5 font-label-md text-label-md text-on-surface hover:bg-surface-container-low"
              onClick={() => {
                setActivePage("profile");
                setIsUserMenuOpen(false);
              }}
              type="button"
            >
              <Icon name="person" /> Profil
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2.5 font-label-md text-label-md text-error hover:bg-error-container"
              onClick={onLogout}
              type="button"
            >
              <Icon name="logout" /> Çıkış Yap
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
