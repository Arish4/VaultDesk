import type { ReactNode } from "react";

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <p className="status" role="status">
      <span className="spinner" /> {label}
    </p>
  );
}

export function ErrorMessage({ error, onRetry }: { error: Error | null; onRetry?: () => void }) {
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

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {children}
    </div>
  );
}
