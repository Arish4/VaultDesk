import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Loading } from "./components/StatusMessage";
import { AppShell } from "./layout/AppShell";

// Code splitting: each page is downloaded only when the user first opens it.
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const RoomsPage = lazy(() => import("./pages/RoomsPage"));
const RoomDetailPage = lazy(() => import("./pages/RoomDetailPage"));
const MyBookingsPage = lazy(() => import("./pages/MyBookingsPage"));
const MaintenancePage = lazy(() => import("./pages/MaintenancePage"));
const ApprovalsPage = lazy(() => import("./pages/ApprovalsPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

const protect = (page) => <ProtectedRoute>{page}</ProtectedRoute>;

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          {/* Layout route: every page below renders inside the shell's <Outlet />. */}
          <Route element={<AppShell />}>
            <Route path="/" element={<CalendarPage />} />
            <Route path="/rooms" element={<RoomsPage />} />
            <Route path="/rooms/:id" element={<RoomDetailPage />} />
            <Route path="/bookings" element={protect(<MyBookingsPage />)} />
            <Route path="/maintenance" element={protect(<MaintenancePage />)} />
            <Route path="/approvals" element={protect(<ApprovalsPage />)} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
