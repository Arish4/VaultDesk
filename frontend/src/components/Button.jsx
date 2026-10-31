// Reusable button: one look, many uses. Extra props (onClick, type, disabled) pass straight through.
export function Button({ variant = "primary", loading = false, children, ...props }) {
  return (
    <button className={`btn btn--${variant}`} disabled={loading || props.disabled} {...props}>
      {loading ? "Please wait…" : children}
    </button>
  );
}
