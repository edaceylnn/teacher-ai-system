export default function Toggle({ checked, disabled = false, id, label, onChange }) {
  return (
    <label
      className={`flex items-center gap-3 ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
      htmlFor={id}
    >
      <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
        <input
          checked={checked}
          className="peer sr-only"
          disabled={disabled}
          id={id}
          onChange={(event) => onChange(event.target.checked)}
          type="checkbox"
        />
        <span className="absolute inset-0 rounded-full bg-outline-variant transition-colors peer-checked:bg-primary" />
        <span className="absolute left-0.5 h-5 w-5 rounded-full bg-surface-container-lowest shadow-sm transition-transform peer-checked:translate-x-5" />
      </span>
      {label && <span className="font-body-md text-body-md text-on-surface">{label}</span>}
    </label>
  );
}
