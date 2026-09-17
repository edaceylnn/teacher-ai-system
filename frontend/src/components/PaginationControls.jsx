import Button from "./Button";
import Icon from "./Icon";

export default function PaginationControls({ limit, offset, setOffset, total }) {
  if (!total) return null;

  const start = offset + 1;
  const end = Math.min(offset + limit, total);
  const canGoBack = offset > 0;
  const canGoForward = offset + limit < total;

  return (
    <div className="pagination-controls">
      <span>
        {start}-{end} / {total}
      </span>
      <div>
        <Button
          aria-label="Önceki sayfa"
          disabled={!canGoBack}
          onClick={() => setOffset(Math.max(offset - limit, 0))}
          size="sm"
          variant="icon"
        >
          <Icon name="chevron_left" />
        </Button>
        <Button
          aria-label="Sonraki sayfa"
          disabled={!canGoForward}
          onClick={() => setOffset(offset + limit)}
          size="sm"
          variant="icon"
        >
          <Icon name="chevron_right" />
        </Button>
      </div>
    </div>
  );
}
