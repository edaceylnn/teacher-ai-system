import Icon from "./Icon";

export default function EmptyState({ actionLabel, compact = false, icon = "inbox", onAction, text }) {
  return (
    <div className={`empty-state ${compact ? "empty-state-compact" : ""}`}>
      <span className="empty-state-icon">
        <Icon name={icon} />
      </span>
      <p>{text}</p>
      {actionLabel && onAction && (
        <button className="link-button" onClick={onAction} type="button">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
