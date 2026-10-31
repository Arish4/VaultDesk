export function Loading({ label = "Loading…" }) {
  return (
    <p className="status" role="status">
      <span className="spinner" /> {label}
    </p>
  );
}

export function ErrorMessage({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="status status--error" role="alert">
      <span>{error.message ?? String(error)}</span>
      {onRetry && (
        <button className="link-button" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {children}
    </div>
  );
}
