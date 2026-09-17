import Button from "./Button";
import Icon from "./Icon";

export default function EmptyState({ actionLabel, compact = false, icon = "inbox", onAction, text, title }) {
  return (
    <div className={`empty-state ${compact ? "empty-state-compact" : ""}`}>
      <span className="empty-state-icon">
        <Icon name={icon} />
      </span>
      {title && <h3>{title}</h3>}
      <p>{text}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm" tone="primary" variant="ghost">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
