export default function Icon({ name, className = "", filled = false }) {
  const classes = ["material-symbols-outlined", filled ? "fill-icon" : "", className]
    .filter(Boolean)
    .join(" ");
  return <span className={classes}>{name}</span>;
}
