import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import { bookingsApi, spacesApi, type NewBooking } from "../api/vaultdesk";
import { useAuthStore } from "../stores/authStore";
import { useSummaryStore } from "../stores/summaryStore";
import { AvailabilityBar } from "../components/AvailabilityBar";
import { BookingForm } from "../components/BookingForm";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { RoomForm } from "../components/RoomForm";
import { Icon, KIND_ICON } from "../components/icons";
import { EmptyState, ErrorMessage, Loading } from "../components/StatusMessage";
import { useApi } from "../hooks/useApi";
import type { Location, Space } from "../types";
import { formatPrice, todayISO } from "../utils/time";

export default function RoomDetailPage() {
  const { id = "" } = useParams();
  const refreshSummary = useSummaryStore((state) => state.refresh);
  const status = useAuthStore((state) => state.status);
  const isStaff = useAuthStore((state) => Boolean(state.user?.is_staff));
  const navigate = useNavigate();
  const location = useLocation();
  const [date, setDate] = useState(todayISO());
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // All hooks run before any early return below (React's rules of hooks).
  const space = useApi((signal) => spacesApi.get(id, signal), [id, status]);
  const availability = useApi((signal) => spacesApi.availability(id, date, signal), [id, date]);
  const locations = useApi((signal) => (isStaff ? spacesApi.locations(signal) : Promise.resolve<Location[]>([])), [isStaff]);

  if (space.loading) return <Loading />;
  if (space.error instanceof ApiError && space.error.status === 404) {
    return (
      <EmptyState title="This room doesn't exist anymore.">
        <Link to="/rooms">See all rooms →</Link>
      </EmptyState>
    );
  }
  if (space.error) return <ErrorMessage error={space.error} onRetry={space.reload} />;

  const room = space.data;
  if (!room) return null;

  async function book(fields: Omit<NewBooking, "spaceId">) {
    if (!room) return;
    const booking = await bookingsApi.create({ spaceId: room.id, ...fields });
    refreshSummary();
    navigate("/bookings", { state: { justBooked: room.name, pending: booking.status === "pending" } });
  }

  function roomSaved(saved: Space) {
    setEditing(false);
    setNotice(`Saved. ${saved.is_active ? "Members see the changes now." : "The room is now hidden from members."}`);
    space.reload();
    availability.reload();
  }

  return (
    <div className="page-wide">
      <div className="page-header">
        <Link to="/rooms" className="back-link">
          <Icon name="chevronLeft" size={16} /> All rooms
        </Link>
        {isStaff && (
          <Button variant="ghost" onClick={() => setEditing(true)} disabled={!locations.data?.length}>
            <Icon name="wrench" size={16} /> Edit room
          </Button>
        )}
      </div>

      {notice && (
        <p className="status status--success" role="status">
          {notice}
        </p>
      )}
      {!room.is_active && (
        <p className="notice">This room is hidden. Members can't see or book it. Edit the room to make it visible again.</p>
      )}

      <div className="detail">
        <section className="panel detail__info">
          <span className="room-icon room-icon--lg">
            <Icon name={KIND_ICON[room.kind] ?? "rooms"} size={26} />
          </span>
          <h2 className="page-title">{room.name}</h2>
          <p className="muted">
            {room.kind_label} · {room.location.name}, {room.location.address}
          </p>
          {room.requires_approval && (
            <p className="notice">Bookings for this room need a manager's approval before they're confirmed.</p>
          )}
          <dl className="facts">
            <div>
              <dt>Capacity</dt>
              <dd>{room.capacity}</dd>
            </div>
            <div>
              <dt>Price</dt>
              <dd>{Number(room.hourly_price) === 0 ? "Free" : `${formatPrice(room.hourly_price)}/hr`}</dd>
            </div>
            <div>
              <dt>Open</dt>
              <dd>
                {room.location.opens_at.slice(0, 5)}–{room.location.closes_at.slice(0, 5)}
              </dd>
            </div>
          </dl>
          {room.amenities.length > 0 && (
            <div className="room-card__amenities">
              {room.amenities.map((amenity) => (
                <span key={amenity} className="tag">
                  {amenity}
                </span>
              ))}
            </div>
          )}
        </section>

        {room.is_active && <section className="panel">
          <h3>Book this room</h3>
          <label className="date-field">
            Date
            <input type="date" value={date} min={todayISO()} onChange={(e) => setDate(e.target.value)} />
          </label>

          {availability.data && (
            <AvailabilityBar
              date={date}
              opensAt={availability.data.opens_at}
              closesAt={availability.data.closes_at}
              booked={availability.data.booked}
            />
          )}
          <ErrorMessage error={availability.error} onRetry={availability.reload} />

          {status !== "authenticated" ? null : availability.data ? (
            // key={date} resets the form state when the date changes; it waits for availability
            // so the suggested start time can skip slots that are already booked.
            <BookingForm
              key={date}
              space={room}
              opensAt={room.location.opens_at}
              closesAt={room.location.closes_at}
              date={date}
              booked={availability.data.booked}
              onSubmit={book}
            />
          ) : (
            !availability.error && <Loading />
          )}
          {status === "anonymous" && (
            <p className="hint">
              <Link to="/login" state={{ from: location.pathname }}>
                Log in
              </Link>{" "}
              to book this room.
            </p>
          )}
        </section>}
      </div>

      {editing && (
        <Modal title={`Edit ${room.name}`} subtitle={room.location.name} onClose={() => setEditing(false)}>
          <RoomForm room={room} locations={locations.data ?? []} onSaved={roomSaved} />
        </Modal>
      )}
    </div>
  );
}
