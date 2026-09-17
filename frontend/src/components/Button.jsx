const VARIANT_CLASSES = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  danger: "btn-danger",
  icon: "btn-icon",
};

const SIZE_CLASSES = {
  sm: "btn-sm",
  md: "btn-md",
  lg: "btn-lg",
};

// Single source of truth for every action button in the app — size (sm/md/lg)
// controls height/padding/icon-gap/icon-size, variant controls color and
// hover/active/focus/disabled states. See the ".btn*" rules in styles.css.
export default function Button({
  children,
  className = "",
  fullWidth = false,
  size = "md",
  tone,
  type = "button",
  variant = "secondary",
  ...rest
}) {
  const classes = [
    "btn",
    VARIANT_CLASSES[variant] || VARIANT_CLASSES.secondary,
    SIZE_CLASSES[size] || SIZE_CLASSES.md,
    tone ? `btn-tone-${tone}` : "",
    fullWidth ? "btn-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} type={type} {...rest}>
      {children}
    </button>
  );
}
