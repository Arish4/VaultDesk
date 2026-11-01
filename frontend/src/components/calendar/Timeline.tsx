import { useEffect, useRef, type CSSProperties, type MouseEvent } from "react";
import type { CalendarBooking, CalendarLocation, CalendarSpace } from "../../types";
import { blockPosition, formatHourLabel, hourAt, minutesFromGridStart, pad, type Grid } from "../../utils/timeline";
import { formatTime } from "../../utils/time";
import { Icon, KIND_ICON } from "../icons";

const HOUR_WIDTH = 104; // px per hour column

function RoomLabel({ space }: { space: CalendarSpace }) {
  return (
    <div className="room-label">
      <span className={`room-icon ${space.out_of_service ? "room-icon--off" : ""}`}>
        <Icon name={KIND_ICON[space.kind] ?? "rooms"} />
      </span>
      <div className="room-label__text">
        <strong>{space.name}</strong>
        <span className="muted">
          <Icon name="users" size={14} /> {space.capacity} {space.capacity === 1 ? "seat" : "seats"}
          {space.amenities.length > 0 && ` · ${space.amenities.join(", ")}`}
        </span>
      </div>
    </div>
  );
}

function BookingBlock({ booking, grid, onSelect }: { booking: CalendarBooking; grid: Grid; onSelect: () => void }) {
  const { left, width } = blockPosition(booking.start_at, booking.end_at, grid);
  if (width <= 0) return null;
  const tone = booking.status === "pending" ? "pending" : booking.is_mine ? "mine" : "confirmed";
  return (
    <button
      className={`block block--${tone}`}
      style={{ left, width: width - 4 }}
      onClick={(event) => {
        event.stopPropagation(); // don't also trigger "book this empty slot"
        onSelect();
      }}
      title={`${booking.title} · ${formatTime(booking.start_at)}–${formatTime(booking.end_at)}`}
    >
      {/* Sticky content: when the block starts off-screen, its title slides into view. */}
      <span className="block__content">
        <strong>{booking.title}</strong>
        <span>
          {formatTime(booking.start_at)}–{formatTime(booking.end_at)}
          {booking.status === "pending" && " · pending"}
        </span>
      </span>
    </button>
  );
}

/**
 * Rooms down the side, hours across the top, bookings as blocks.
 * Click an empty future slot to book it, click a block to see details.
 */
interface Props {
  locations: CalendarLocation[];
  date: string;
  startHour: number;
  endHour: number;
  now: string;
  onSlotClick: (space: CalendarSpace, hour: number) => void;
  onBookingClick: (booking: CalendarBooking, space: CalendarSpace) => void;
}

export function Timeline({ locations, date, startHour, endHour, now, onSlotClick, onBookingClick }: Props) {
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const gridWidth = hours.length * HOUR_WIDTH;
  const grid: Grid = { date, startHour, endHour, hourWidth: HOUR_WIDTH };
  const nowOffset = (minutesFromGridStart(now, date, startHour) / 60) * HOUR_WIDTH;
  const showNow = nowOffset >= 0 && nowOffset <= gridWidth;
  const pastWidth = Math.min(gridWidth, Math.max(0, nowOffset)); // greyed-out time that can't be booked
  const scrollRef = useRef<HTMLDivElement>(null);

  // On a new date, scroll so the hour before "now" is the first column (snapped to a whole hour).
  useEffect(() => {
    if (!scrollRef.current) return;
    const firstHour = showNow ? Math.max(0, Math.floor(nowOffset / HOUR_WIDTH) - 1) : 0;
    scrollRef.current.scrollLeft = firstHour * HOUR_WIDTH;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  function handleRowClick(event: MouseEvent<HTMLDivElement>, space: CalendarSpace) {
    if (space.out_of_service) return;
    const x = event.clientX - event.currentTarget.getBoundingClientRect().left;
    const hour = hourAt(x, grid);
    const hourEnds = new Date(`${date}T${pad(hour + 1)}:00:00`);
    if (hourEnds <= new Date(now)) return; // that hour is already over
    onSlotClick(space, hour);
  }

  return (
    <div className="timeline" ref={scrollRef}>
      <div className="timeline__inner" style={{ "--hours": hours.length, "--hour-width": `${HOUR_WIDTH}px` } as CSSProperties}>
        <div className="timeline__head">
          <div className="timeline__corner">Room</div>
          <div className="timeline__hours">
            {hours.map((hour) => (
              <span key={hour}>{formatHourLabel(hour)}</span>
            ))}
            {showNow && (
              <span className="now-badge" style={{ left: nowOffset }}>
                {formatTime(now)}
              </span>
            )}
          </div>
        </div>

        {locations.map((location) => (
          <div key={location.id} className="timeline__group">
            <div className="group-row">
              {/* The label sticks to the left edge while the hours scroll sideways. */}
              <div className="group-row__label">
                <strong>{location.name}</strong>
                <span>
                  {location.spaces.length} rooms · {location.spaces.reduce((sum, s) => sum + s.capacity, 0)} seats
                </span>
              </div>
            </div>

            {location.spaces.map((space) => (
              <div key={space.id} className="timeline__row">
                <RoomLabel space={space} />
                <div
                  className={`timeline__track ${space.out_of_service ? "timeline__track--off" : ""}`}
                  onClick={(event) => handleRowClick(event, space)}
                  role="button"
                  aria-label={`Book ${space.name}`}
                >
                  {pastWidth > 0 && <span className="past-shade" style={{ width: pastWidth }} />}
                  {space.out_of_service && (
                    <span className="off-label">
                      <Icon name="wrench" size={14} /> Out of service
                    </span>
                  )}
                  {space.bookings.map((booking) => (
                    <BookingBlock key={booking.id} booking={booking} grid={grid} onSelect={() => onBookingClick(booking, space)} />
                  ))}
                  {showNow && <span className="now-line" style={{ left: nowOffset }} />}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
