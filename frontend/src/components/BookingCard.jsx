import { formatDay, formatPrice, formatTime } from "../utils/time";
import { Button } from "./Button";
import { Icon, KIND_ICON } from "./icons";

export function BookingCard({ booking, onCancel, cancelling, actions }) {
  const isActive = ["confirmed", "pending"].includes(booking.status);
  const canCancel = isActive && new Date(booking.start_at) > new Date() && onCancel;

  return (
    <article className={`booking-card booking-card--${booking.status}`}>
      <span className="room-icon">
        <Icon name={KIND_ICON[booking.space.kind] ?? "rooms"} />
      </span>
      <div className="booking-card__main">
        <strong>{booking.title || booking.space.name}</strong>
        <span className="muted">
          {booking.space.name} · {booking.space.location.name}
          {booking.requested_by && ` · requested by ${booking.requested_by}`}
        </span>
      </div>
      <div className="booking-card__when">
        <strong>{formatDay(booking.start_at)}</strong>
        <span className="muted">
          <Icon name="clock" size={14} /> {formatTime(booking.start_at)} – {formatTime(booking.end_at)}
        </span>
      </div>
      <div className="booking-card__side">
        <span className={`pill pill--${booking.status}`}>{booking.status_label}</span>
        <strong>{formatPrice(booking.total_price)}</strong>
      </div>
      <div className="booking-card__actions">
        {actions}
        {canCancel && (
          <Button variant="ghost" loading={cancelling} onClick={() => onCancel(booking)}>
            Cancel
          </Button>
        )}
      </div>
    </article>
  );
}
