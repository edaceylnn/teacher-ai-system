import Icon from "./Icon";

const NAV_ITEMS = [
  { page: "dashboard", icon: "dashboard", label: "Kontrol Paneli" },
  { page: "classrooms", icon: "school", label: "Sınıflarım", matchAlso: ["classroomDetail"] },
  { page: "students", icon: "groups", label: "Öğrencilerim", matchAlso: ["studentDetail"] },
  { page: "gradebook", icon: "menu_book", label: "Not Defteri" },
  { page: "attendance", icon: "calendar_today", label: "Devamsızlık" },
  { page: "schedule", icon: "schedule", label: "Ders Programı" },
  { page: "aiReports", icon: "analytics", label: "AI Raporları" },
];

export default function Sidebar({
  activePage,
  isAdminUser,
  isMobileOpen,
  onCloseMobile,
  setActivePage,
}) {
  const navItems = isAdminUser
    ? [...NAV_ITEMS, { page: "teachers", icon: "supervisor_account", label: "Öğretmenler" }]
    : NAV_ITEMS;

  return (
    <>
      {isMobileOpen && (
        <div
          className="sidenav-backdrop fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={onCloseMobile}
        />
      )}
      <aside
        className={`sidenav fixed left-0 top-0 z-40 flex h-screen w-[240px] flex-col border-r border-outline-variant bg-surface px-4 py-6 transition-transform duration-200 md:translate-x-0 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container font-headline-md text-headline-md font-bold text-on-primary">
            T
          </div>
          <div>
            <h1 className="font-headline-md text-headline-md font-bold leading-tight text-primary">
              Teacher AI
            </h1>
            <p className="font-label-md text-label-md uppercase tracking-wider text-secondary">
              Eğitmen Paneli
            </p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto no-scrollbar">
          {navItems.map((item) => {
            const isActive = activePage === item.page || item.matchAlso?.includes(activePage);
            return (
              <button
                className={`flex items-center gap-3 rounded-lg px-3 py-2 font-label-md text-label-md transition-colors duration-100 ${
                  isActive
                    ? "bg-surface-container-low font-bold text-primary"
                    : "text-secondary hover:bg-surface-container-low"
                }`}
                key={item.page}
                onClick={() => setActivePage(item.page)}
                type="button"
              >
                <Icon name={item.icon} filled={isActive} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-4 flex flex-col gap-1 border-t border-outline-variant pt-4">
          <button
            className={`flex items-center gap-3 rounded-lg px-3 py-2 font-label-md text-label-md transition-colors ${
              activePage === "settings"
                ? "font-bold text-primary"
                : "text-secondary hover:bg-surface-container-low"
            }`}
            onClick={() => setActivePage("settings")}
            type="button"
          >
            <Icon filled={activePage === "settings"} name="settings" />
            Ayarlar
          </button>
        </div>
      </aside>
    </>
  );
}
