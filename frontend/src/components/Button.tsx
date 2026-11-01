import type { ButtonHTMLAttributes } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger";
  loading?: boolean;
}

// Reusable button: one look, many uses. Extra props (onClick, type) pass straight through.
export function Button({ variant = "primary", loading = false, disabled, children, ...props }: Props) {
  return (
    <button className={`btn btn--${variant}`} disabled={loading || disabled} {...props}>
      {loading ? "Please wait…" : children}
    </button>
  );
}
