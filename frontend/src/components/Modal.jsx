import Icon from "./Icon";

export default function Modal({ children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-xl border border-outline-variant bg-surface-container-lowest p-container-padding shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          aria-label="Kapat"
          className="absolute right-4 top-4 text-secondary hover:text-primary"
          onClick={onClose}
          type="button"
        >
          <Icon name="close" />
        </button>
        {children}
      </div>
    </div>
  );
}
