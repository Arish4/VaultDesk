import { NavLink, useLocation } from "react-router-dom";
import { Icon } from "../components/icons";

// Page navigation only. The building filter lives in the top bar (Topbar.jsx).
export function Sidebar({ items }) {
  const { search } = useLocation();

  return (
    <aside className="sidebar">
      <NavLink to="/" className="sidebar__brand">
        <Icon name="logo" size={24} strokeWidth={2.2} />
        VaultDesk
      </NavLink>
      <div className="sidebar__title">
        <h1>Facilities</h1>
        <p>Meeting rooms, maintenance and approvals</p>
      </div>

      <nav className="sidebar__nav" aria-label="Pages">
        {items.map((item) => (
          // Keep ?building= when switching pages, so the chosen building stays selected.
          <NavLink key={item.to} to={{ pathname: item.to, search }} end={item.to === "/"} className="side-link">
            <Icon name={item.icon} />
            <span>{item.label}</span>
            {item.badge > 0 && <span className="badge">{item.badge}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
