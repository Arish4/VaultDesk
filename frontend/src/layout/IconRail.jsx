import { NavLink } from "react-router-dom";
import { Icon } from "../components/icons";

// The thin left column of big icons (like the app switcher in the design).
export function IconRail({ items }) {
  return (
    <nav className="rail" aria-label="Main">
      <NavLink to="/" className="rail__logo" aria-label="VaultDesk home">
        <Icon name="logo" size={26} strokeWidth={2.2} />
      </NavLink>
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.to === "/"} className="rail__item" title={item.label}>
          <Icon name={item.icon} size={22} />
          {item.badge > 0 && <span className="rail__dot" aria-label={`${item.badge} new`} />}
        </NavLink>
      ))}
    </nav>
  );
}
