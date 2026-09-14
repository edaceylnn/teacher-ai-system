export default function FormPanel({
  cancelLabel = "İptal",
  children,
  description,
  onCancel,
  onSubmit,
  submitLabel,
  title,
}) {
  return (
    <form className="form-panel" onSubmit={onSubmit}>
      <div className="form-panel-header">
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      <div className="form-panel-body">{children}</div>
      {submitLabel && (
        <div className="form-panel-footer">
          {onCancel && (
            <button className="outline-button" onClick={onCancel} type="button">
              {cancelLabel}
            </button>
          )}
          <button className="primary-button" type="submit">
            {submitLabel}
          </button>
        </div>
      )}
    </form>
  );
}
