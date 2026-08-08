import Icon from "./Icon";

export default function StatCard({ icon, label, trend, trendDirection, value }) {
  const trendIcon =
    trendDirection === "up"
      ? "trending_up"
      : trendDirection === "down"
        ? "trending_down"
        : null;
  return (
    <div className="stat-card">
      <div className="stat-card-head">
        <span>{label}</span>
        <Icon name={icon} />
      </div>
      <strong>{value}</strong>
      <small>
        {trendIcon && (
          <span className={`stat-trend ${trendDirection}`}>
            <Icon name={trendIcon} />
          </span>
        )}
        {trend}
      </small>
    </div>
  );
}
