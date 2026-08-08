import Icon from "./Icon";

export default function StatusLine({ error, isLoading, notice }) {
  if (!isLoading && !notice && !error) return null;
  return (
    <div className="status-line">
      {isLoading && (
        <span>
          <span className="spinner" /> Yükleniyor
        </span>
      )}
      {notice && (
        <span className="success">
          <Icon name="check_circle" /> {notice}
        </span>
      )}
      {error && (
        <span className="danger">
          <Icon name="error" /> {error}
        </span>
      )}
    </div>
  );
}
