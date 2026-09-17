import Button from "./Button";
import Icon from "./Icon";

export default function ConfirmDialog({
  cancelLabel = "Vazgeç",
  confirmLabel = "Sil",
  description,
  icon = "delete",
  onCancel,
  onConfirm,
  title,
}) {
  return (
    <div className="flex flex-col gap-5 pr-8">
      <div className="flex items-start gap-4">
        <div
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-error-container text-error"
        >
          <Icon className="text-[28px]" name={icon} />
        </div>
        <div className="min-w-0 pt-0.5">
          <h2 className="font-display-md text-display-md text-on-surface">
            {title}
          </h2>
          {description && (
            <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
              {description}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <Button onClick={onCancel} size="md" variant="ghost">
          {cancelLabel}
        </Button>
        <Button onClick={onConfirm} size="md" variant="danger">
          <Icon name={icon} />
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}
