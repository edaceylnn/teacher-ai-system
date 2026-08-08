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
        <button
          aria-label="Önceki sayfa"
          className="icon-action"
          disabled={!canGoBack}
          onClick={() => setOffset(Math.max(offset - limit, 0))}
          type="button"
        >
          <Icon name="chevron_left" />
        </button>
        <button
          aria-label="Sonraki sayfa"
          className="icon-action"
          disabled={!canGoForward}
          onClick={() => setOffset(offset + limit)}
          type="button"
        >
          <Icon name="chevron_right" />
        </button>
      </div>
    </div>
  );
}
