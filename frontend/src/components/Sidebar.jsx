import Icon from "./Icon";
import NavItem from "./NavItem";

export default function Sidebar({
  activePage,
  isCollapsed,
  isMobileOpen,
  onCloseMobile,
  setActiveModal,
  setActivePage,
  toggleCollapsed,
}) {
  const sidenavClassName = [
    "sidenav",
    isCollapsed ? "collapsed" : "",
    isMobileOpen ? "mobile-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <aside className={sidenavClassName}>
      <nav className="nav-menu">
        <div
          className={
            activePage === "dashboard"
              ? "nav-menu-lead-row active"
              : "nav-menu-lead-row"
          }
        >
          <NavItem
            active={activePage === "dashboard"}
            icon="dashboard"
            label="Kontrol Paneli"
            onClick={() => setActivePage("dashboard")}
          />
          <button
            aria-label={isCollapsed ? "Menüyü genişlet" : "Menüyü daralt"}
            className="sidenav-collapse-button"
            onClick={toggleCollapsed}
            type="button"
          >
            <Icon name="chevron_left" />
          </button>
        </div>
        <NavItem
          active={activePage === "classrooms"}
          icon="school"
          label="Sınıflarım"
          onClick={() => setActivePage("classrooms")}
        />
        <NavItem
          active={activePage === "students" || activePage === "studentDetail"}
          icon="groups"
          label="Öğrencilerim"
          onClick={() => setActivePage("students")}
        />
        <NavItem
          active={activePage === "gradebook"}
          icon="grade"
          label="Not Defteri"
          onClick={() => setActivePage("gradebook")}
        />
        <NavItem
          active={activePage === "attendance"}
          icon="calendar_today"
          label="Devamsızlık"
          onClick={() => setActivePage("attendance")}
        />
        <NavItem
          active={activePage === "schedule"}
          icon="calendar_month"
          label="Ders Programı"
          onClick={() => setActivePage("schedule")}
        />
        <NavItem
          active={activePage === "aiReports"}
          icon="auto_awesome"
          label="AI Raporları"
          onClick={() => setActivePage("aiReports")}
        />
      </nav>

      <button
        className="outline-button add-class-button"
        onClick={() => setActiveModal("classroom")}
        type="button"
      >
        <Icon name="add" /> <span>Sınıf Ekle</span>
      </button>
    </aside>
  );
}
