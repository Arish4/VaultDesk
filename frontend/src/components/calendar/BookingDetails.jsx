import { useState } from "react";
import { bookingsApi } from "../../api/vaultdesk";
import { formatDay, formatTime } from "../../utils/time";
import { Button } from "../Button";
import { Modal } from "../Modal";
import { ErrorMessage } from "../StatusMessage";

const STATUS_LABELS = { pending: "Waiting for approval", confirmed: "Confirmed" };

export function BookingDetails({ booking, space, onClose, onChanged }) {
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState(null);
  const canCancel = booking.is_mine && new Date(booking.start_at) > new Date();

  async function cancel() {
    setCancelling(true);
    setError(null);
    try {
      await bookingsApi.cancel(booking.id);
      onChanged();
      onClose();
    } catch (err) {
      setError(err);
      setCancelling(false);
    }
  }

  return (
    <Modal title={booking.title} subtitle={space.name} onClose={onClose} width={420}>
      <dl className="details">
        <div>
          <dt>When</dt>
          <dd>
            {formatDay(booking.start_at)}, {formatTime(booking.start_at)} – {formatTime(booking.end_at)}
          </dd>
        </div>
        <div>
          <dt>Booked by</dt>
          <dd>{booking.is_mine ? "You" : booking.booked_by}</dd>
        </div>
        <div>
          <dt>People</dt>
          <dd>{booking.attendees}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>
            <span className={`pill pill--${booking.status}`}>{STATUS_LABELS[booking.status] ?? booking.status}</span>
          </dd>
        </div>
      </dl>
      <ErrorMessage error={error} />
      {canCancel && (
        <Button variant="danger" loading={cancelling} onClick={cancel}>
          Cancel this booking
        </Button>
      )}
    </Modal>
  );
}
