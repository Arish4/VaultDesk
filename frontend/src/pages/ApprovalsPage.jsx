import { useState } from "react";
import { Navigate } from "react-router-dom";
import { approvalsApi } from "../api/vaultdesk";
import { useAuthStore } from "../stores/authStore";
import { useSummaryStore } from "../stores/summaryStore";
import { BookingCard } from "../components/BookingCard";
import { Button } from "../components/Button";
import { EmptyState, ErrorMessage, Loading } from "../components/StatusMessage";
import { useApi } from "../hooks/useApi";

export default function ApprovalsPage() {
  const isStaff = useAuthStore((state) => Boolean(state.user?.is_staff));
  const refreshSummary = useSummaryStore((state) => state.refresh);
  const queue = useApi((signal) => approvalsApi.pending(signal), []);
  const [busy, setBusy] = useState(null); // `${id}:approve` while a request is running
  const [error, setError] = useState(null);

  if (!isStaff) return <Navigate to="/" replace />; // the API also returns 403

  async function decide(booking, action) {
    setBusy(`${booking.id}:${action}`);
    setError(null);
    try {
      await approvalsApi[action](booking.id);
      queue.reload();
      refreshSummary();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(null);
    }
  }

  const requests = queue.data?.results ?? [];

  return (
    <div className="page-wide">
      <header className="page-header">
        <div>
          <h2 className="page-title">Approvals</h2>
          <p className="muted">Requests for rooms that need a manager's OK. Pending requests already hold their slot.</p>
        </div>
      </header>

      <ErrorMessage error={error} />
      {queue.loading && !queue.data && <Loading />}
      <ErrorMessage error={queue.error} onRetry={queue.reload} />
      {queue.data && requests.length === 0 && <EmptyState title="All caught up. No requests waiting." />}

      <div className="stack">
        {requests.map((booking) => (
          <BookingCard
            key={booking.id}
            booking={booking}
            actions={
              <>
                <Button variant="ghost" loading={busy === `${booking.id}:reject`} onClick={() => decide(booking, "reject")}>
                  Decline
                </Button>
                <Button loading={busy === `${booking.id}:approve`} onClick={() => decide(booking, "approve")}>
                  Approve
                </Button>
              </>
            }
          />
        ))}
      </div>
    </div>
  );
}
