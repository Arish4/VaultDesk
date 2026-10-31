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

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          {/* The whole app needs a login: guests landing anywhere are sent to /login first,
              and return to the page they asked for afterwards. */}
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<CalendarPage />} />
            <Route path="/rooms" element={<RoomsPage />} />
            <Route path="/rooms/:id" element={<RoomDetailPage />} />
            <Route path="/bookings" element={<MyBookingsPage />} />
            <Route path="/maintenance" element={<MaintenancePage />} />
            <Route path="/approvals" element={<ApprovalsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
