import Button from "./Button";
import Icon from "./Icon";

const sizeClasses = {
  compact: "max-w-md",
  standard: "max-w-[520px]",
  wide: "max-w-[560px]",
};

export default function Modal({ children, onClose, size = "compact" }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
      onMouseDown={onClose}
    >
      <div
        className={`relative max-h-[calc(100vh-2rem)] w-full overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest p-container-padding shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05)] ${sizeClasses[size] || sizeClasses.compact}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <Button
          aria-label="Kapat"
          className="absolute right-4 top-4"
          onClick={onClose}
          size="sm"
          variant="icon"
        >
          <Icon name="close" />
        </Button>
        {children}
      </div>
    </div>
  );
}
