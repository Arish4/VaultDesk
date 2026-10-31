import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./icons";

// Reusable dialog: renders into document.body (a portal), closes on Escape or backdrop click.
export function Modal({ title, subtitle, onClose, children, width = 480 }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    dialogRef.current?.focus(); // move keyboard focus into the dialog (accessibility)
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={dialogRef} style={{ width }}>
        <header className="modal__header">
          <div>
            <h2>{title}</h2>
            {subtitle && <p className="muted">{subtitle}</p>}
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </header>
        {children}
      </div>
    </div>,
    document.body,
  );
}
