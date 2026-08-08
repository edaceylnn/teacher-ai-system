import Icon from "./Icon";

export default function Insight({ text, title, tone }) {
  return (
    <div className={`insight ${tone}`}>
      <Icon name={tone === "warning" ? "warning" : "trending_up"} />
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </div>
  );
}
