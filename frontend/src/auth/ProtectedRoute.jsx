import { Navigate, useLocation } from "react-router-dom";
import { Loading } from "../components/StatusMessage";
import { useAuthStore } from "../stores/authStore";

export function ProtectedRoute({ children }) {
  const status = useAuthStore((state) => state.status);
  const location = useLocation();

  if (status === "loading") return <Loading />;
  if (status === "anonymous") {
    // Remember where the user wanted to go, so login can send them back.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}
