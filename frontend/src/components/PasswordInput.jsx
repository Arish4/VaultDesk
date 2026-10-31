import { useState } from "react";
import { Icon } from "./icons";

/**
 * Password field with a show/hide eye button and a Caps Lock warning.
 * Extra props (name, value, onChange, autoComplete...) go straight to the <input>.
 */
export function PasswordInput({ label = "Password", ...inputProps }) {
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  // getModifierState tells us if Caps Lock is on, a common reason for "wrong password".
  const checkCapsLock = (event) => setCapsLock(event.getModifierState?.("CapsLock") ?? false);

  return (
    <label className="field">
      {label}
      <span className="input-with-icon">
        <Icon name="lock" size={18} className="input-with-icon__lead" />
        <input
          {...inputProps}
          type={visible ? "text" : "password"}
          onKeyUp={checkCapsLock}
          onKeyDown={checkCapsLock}
        />
        <button
          type="button"
          className="input-with-icon__action"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          title={visible ? "Hide password" : "Show password"}
        >
          <Icon name={visible ? "eyeOff" : "eye"} size={18} />
        </button>
      </span>
      {capsLock && <span className="field__hint field__hint--warn">Caps Lock is on</span>}
    </label>
  );
}
