import Button from "./Button";

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
            <Button onClick={onCancel} size="md" variant="ghost">
              {cancelLabel}
            </Button>
          )}
          <Button size="md" type="submit" variant="primary">
            {submitLabel}
          </Button>
        </div>
      )}
    </form>
  );
}
