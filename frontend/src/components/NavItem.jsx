import Icon from "./Icon";

export default function NavItem({ active = false, icon, label, onClick }) {
  return (
    <button
      className={active ? "nav-link active" : "nav-link"}
      onClick={onClick}
      type="button"
    >
      <Icon name={icon} />
      <span>{label}</span>
    </button>
  );
}
