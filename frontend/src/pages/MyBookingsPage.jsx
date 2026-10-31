import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { bookingsApi } from "../api/vaultdesk";
import { useSummaryStore } from "../stores/summaryStore";
import { BookingCard } from "../components/BookingCard";
import { EmptyState, ErrorMessage, Loading } from "../components/StatusMessage";
import { useApi } from "../hooks/useApi";

const TABS = [
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past & cancelled" },
];

export default function MyBookingsPage() {
  const { state } = useLocation();
  const refreshSummary = useSummaryStore((state) => state.refresh);
  const bookings = useApi((signal) => bookingsApi.mine(signal), []);
  const [tab, setTab] = useState("upcoming");
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelError, setCancelError] = useState(null);

  // Split once per data change, not on every render.
  const groups = useMemo(() => {
    const all = bookings.data?.results ?? [];
    const now = new Date();
    const isUpcoming = (b) => ["confirmed", "pending"].includes(b.status) && new Date(b.end_at) > now;
    return {
      upcoming: all.filter(isUpcoming).reverse(), // soonest first
      past: all.filter((b) => !isUpcoming(b)),
    };
  }, [bookings.data]);

  async function cancel(booking) {
    if (!window.confirm(`Cancel "${booking.title || booking.space.name}"?`)) return;
    setCancellingId(booking.id);
    setCancelError(null);
    try {
      await bookingsApi.cancel(booking.id);
      bookings.reload();
      refreshSummary();
    } catch (error) {
      setCancelError(error);
    } finally {
      setCancellingId(null);
    }
  }

  const list = groups[tab];

  return (
    <div className="page-wide">
      <header className="page-header">
        <div>
          <h2 className="page-title">My bookings</h2>
          <p className="muted">Everything you've booked or requested.</p>
        </div>
        <div className="chips">
          {TABS.map((t) => (
            <button key={t.id} className={`chip ${tab === t.id ? "chip--active" : ""}`} onClick={() => setTab(t.id)}>
              {t.label} <span className="chip__count">{groups[t.id].length}</span>
            </button>
          ))}
        </div>
      </header>

      {state?.justBooked && (
        <p className="status status--success">
          {state.pending
            ? `Request sent for ${state.justBooked}. A manager will review it.`
            : `Booked ${state.justBooked}. A confirmation email is on its way.`}
        </p>
      )}
      <ErrorMessage error={cancelError} />
      {bookings.loading && !bookings.data && <Loading />}
      <ErrorMessage error={bookings.error} onRetry={bookings.reload} />

      {bookings.data && list.length === 0 && (
        <EmptyState title={tab === "upcoming" ? "No upcoming bookings." : "Nothing here yet."}>
          <Link to="/">Open the calendar →</Link>
        </EmptyState>
      )}

      <div className="stack">
        {list.map((booking) => (
          <BookingCard key={booking.id} booking={booking} onCancel={cancel} cancelling={cancellingId === booking.id} />
        ))}
      </div>
    </div>
  );
}
