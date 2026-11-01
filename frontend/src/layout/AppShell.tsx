import { useMemo } from "react";
import { Outlet } from "react-router-dom";
import { spacesApi } from "../api/vaultdesk";
import type { IconName } from "../components/icons";
import { useApi } from "../hooks/useApi";
import { useAuthStore } from "../stores/authStore";
import { useSummaryStore } from "../stores/summaryStore";
import { IconRail } from "./IconRail";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  badge?: number | null;
}

/** Page frame: icon rail + sidebar + top bar. Pages render inside <Outlet />. */
export function AppShell() {
  // Selectors: this component re-renders only when these exact values change.
  const isStaff = useAuthStore((state) => Boolean(state.user?.is_staff));
  const counts = useSummaryStore((state) => state.counts);
  const locations = useApi((signal) => spacesApi.locations(signal), []);

  const navItems = useMemo(() => {
    const items: NavItem[] = [
      { to: "/", label: "Calendar", icon: "calendar" },
      { to: "/rooms", label: "Meeting rooms", icon: "presentation" },
      { to: "/bookings", label: "My bookings", icon: "bookings", badge: counts?.my_upcoming },
      { to: "/maintenance", label: "Maintenance", icon: "wrench", badge: counts?.open_issues },
    ];
    if (isStaff) items.push({ to: "/approvals", label: "Approvals", icon: "approvals", badge: counts?.pending_approvals });
    return items;
  }, [counts, isStaff]);

  return (
    <div className="shell">
      <IconRail items={navItems} />
      <Sidebar items={navItems} />
      <div className="shell__main">
        <Topbar locations={locations.data ?? []} />
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
