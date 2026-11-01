import { Link } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { Icon } from "../components/icons";
import { useBuilding } from "../hooks/useBuilding";
import { useAuthStore } from "../stores/authStore";
import { useUiStore } from "../stores/uiStore";
import type { Location } from "../types";

export function Topbar({ locations = [] }: { locations?: Location[] }) {
  // useShallow: picking several fields returns a new object each time; shallow-compare it
  // so the component doesn't re-render (or loop) when nothing actually changed.
  const { status, user, logout } = useAuthStore(useShallow((s) => ({ status: s.status, user: s.user, logout: s.logout })));
  const search = useUiStore((s) => s.search);
  const setSearch = useUiStore((s) => s.setSearch);
  const [building, setBuilding] = useBuilding();

  return (
    <header className="topbar">
      <div className="topbar__left">
        <label className="search">
          <Icon name="search" />
          <input
            type="search"
            placeholder="Search rooms…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search rooms"
          />
        </label>
        {/* Same building filter as the sidebar, for screens where the sidebar is hidden. */}
        <label className="building-picker">
          <span>Building</span>
          <select value={building} onChange={(event) => setBuilding(event.target.value)} aria-label="Building">
            <option value="">All buildings</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {status === "authenticated" && user ? (
        <div className="user-chip">
          <span className="avatar" aria-hidden="true">
            {user.username[0].toUpperCase()}
          </span>
          <div className="user-chip__text">
            <strong>{user.username}</strong>
            <span>{user.is_staff ? "Facility manager" : "Member"}</span>
          </div>
          <button className="icon-button" onClick={logout} title="Log out" aria-label="Log out">
            <Icon name="logout" />
          </button>
        </div>
      ) : (
        status === "anonymous" && (
          <Link to="/login" className="btn btn--primary btn--small">
            Log in
          </Link>
        )
      )}
    </header>
  );
}
