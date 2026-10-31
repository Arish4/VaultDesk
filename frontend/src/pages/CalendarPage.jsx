import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { bookingsApi, calendarApi } from "../api/vaultdesk";
import { useAuthStore } from "../stores/authStore";
import { useSummaryStore } from "../stores/summaryStore";
import { useUiStore } from "../stores/uiStore";
import { BookingForm } from "../components/BookingForm";
import { BookingDetails } from "../components/calendar/BookingDetails";
import { StatCards } from "../components/calendar/StatCards";
import { Timeline } from "../components/calendar/Timeline";
import { Icon } from "../components/icons";
import { Modal } from "../components/Modal";
import { EmptyState, ErrorMessage, Loading } from "../components/StatusMessage";
import { useApi } from "../hooks/useApi";
import { useBuilding } from "../hooks/useBuilding";
import { addDays, formatDay, todayISO } from "../utils/time";
import { pad, visibleHours } from "../utils/timeline";

export default function CalendarPage() {
  const search = useUiStore((state) => state.search);
  const refreshSummary = useSummaryStore((state) => state.refresh);
  const status = useAuthStore((state) => state.status);
  const navigate = useNavigate();
  const [building] = useBuilding();
  const [date, setDate] = useState(todayISO());
  const [newBooking, setNewBooking] = useState(null); // { space, startHour } while the dialog is open
  const [selected, setSelected] = useState(null); // { booking, space } for the details dialog

  const calendar = useApi((signal) => calendarApi.day({ date, location: building }, signal), [date, building, status]);

  // Search box filters rooms on the client; buildings with no matching room are hidden.
  const locations = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (calendar.data?.locations ?? [])
      .map((location) => ({
        ...location,
        spaces: location.spaces.filter((space) => !term || space.name.toLowerCase().includes(term)),
      }))
      .filter((location) => location.spaces.length > 0);
  }, [calendar.data, search]);

  const [startHour, endHour] = visibleHours(calendar.data?.locations ?? []);
  const isToday = date === todayISO();
  const roomCount = locations.reduce((sum, l) => sum + l.spaces.length, 0);
  const heading = building && locations[0] ? locations[0].name : "All buildings";

  function openSlot(space, hour) {
    if (status !== "authenticated") {
      navigate("/login", { state: { from: "/" } });
      return;
    }
    setNewBooking({ space, startHour: hour });
  }

  async function createBooking(fields) {
    await bookingsApi.create({ spaceId: newBooking.space.id, ...fields });
    setNewBooking(null);
    calendar.reload();
    refreshSummary();
  }

  const findLocation = (space) => calendar.data.locations.find((l) => l.spaces.some((s) => s.id === space.id));

  return (
    <div className="page-wide">
      <header className="page-header">
        <div>
          <h2 className="page-title">
            Meeting room calendar <Icon name="star" size={18} className="title-star" />
          </h2>
          <p className="muted">
            {heading} · {roomCount} rooms
          </p>
        </div>
        <div className="date-nav">
          <button className="icon-button" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">
            <Icon name="chevronLeft" />
          </button>
          <button className={`chip ${isToday ? "chip--active" : ""}`} onClick={() => setDate(todayISO())}>
            Today
          </button>
          <button className="icon-button" onClick={() => setDate(addDays(date, 1))} aria-label="Next day">
            <Icon name="chevronRight" />
          </button>
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Pick a date" />
        </div>
      </header>

      {calendar.data && <StatCards stats={calendar.data.stats} isToday={isToday} />}

      <div className="legend">
        <span><i className="swatch swatch--confirmed" /> Booked</span>
        <span><i className="swatch swatch--mine" /> Yours</span>
        <span><i className="swatch swatch--pending" /> Pending approval</span>
        <span><i className="swatch swatch--off" /> Out of service</span>
        <span className="legend__tip">
          <Icon name="sparkle" size={14} /> Click an empty slot to book it · {formatDay(`${date}T12:00:00`)}
        </span>
      </div>

      {calendar.loading && !calendar.data && <Loading label="Loading the calendar…" />}
      <ErrorMessage error={calendar.error} onRetry={calendar.reload} />
      {calendar.data && locations.length === 0 && <EmptyState title="No rooms match your search." />}

      {locations.length > 0 && (
        <div className={calendar.loading ? "is-stale" : ""}>
          <Timeline
            locations={locations}
            date={date}
            startHour={startHour}
            endHour={endHour}
            now={calendar.data.now}
            onSlotClick={openSlot}
            onBookingClick={(booking, space) => setSelected({ booking, space })}
          />
        </div>
      )}

      {newBooking && (
        <Modal
          title={`Book ${newBooking.space.name}`}
          subtitle={`${formatDay(`${date}T12:00:00`)} · up to ${newBooking.space.capacity} people`}
          onClose={() => setNewBooking(null)}
        >
          <BookingForm
            space={newBooking.space}
            opensAt={findLocation(newBooking.space).opens_at}
            closesAt={findLocation(newBooking.space).closes_at}
            date={date}
            booked={newBooking.space.bookings}
            initialStart={`${pad(newBooking.startHour)}:00`}
            onSubmit={createBooking}
          />
        </Modal>
      )}

      {selected && (
        <BookingDetails
          booking={selected.booking}
          space={selected.space}
          onClose={() => setSelected(null)}
          onChanged={() => {
            calendar.reload();
            refreshSummary();
          }}
        />
      )}
    </div>
  );
}
