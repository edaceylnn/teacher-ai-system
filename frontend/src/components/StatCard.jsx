import Icon from "./Icon";

export default function StatCard({ icon, label, onClick, trend, trendDirection, value }) {
  const trendIcon =
    trendDirection === "up"
      ? "trending_up"
      : trendDirection === "down"
        ? "trending_down"
        : null;
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      className={`stat-card text-left ${
        onClick ? "cursor-pointer transition-all duration-200 hover:border-primary/50 hover:shadow-sm" : ""
      }`}
      onClick={onClick}
      type={onClick ? "button" : undefined}
    >
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
    </Wrapper>
  );
}
