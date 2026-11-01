import type { DayStats } from "../../types";
import { formatTime } from "../../utils/time";

// The three-number summary strip above the calendar.
export function StatCards({ stats, isToday }: { stats: DayStats; isToday: boolean }) {
  return (
    <section className="stats" aria-label="Today at a glance">
      <div className="stat">
        <span className="stat__label">In use now</span>
        <strong className="stat__value">
          {isToday ? stats.in_use_now : "–"} <small>of {stats.rooms_total} rooms</small>
        </strong>
        <span className="stat__hint">
          {isToday && stats.busy_room ? `${stats.busy_room.name} · until ${formatTime(stats.busy_room.until)}` : "Live status shows for today"}
        </span>
      </div>
      <div className="stat">
        <span className="stat__label">Bookings {isToday ? "today" : "this day"}</span>
        <strong className="stat__value">{stats.bookings_total}</strong>
        <span className="stat__hint">
          {stats.pending} pending · {stats.out_of_service} out of service
        </span>
      </div>
      <div className="stat">
        <span className="stat__label">Next free</span>
        <strong className="stat__value stat__value--text">{isToday && stats.next_free ? stats.next_free.name : "–"}</strong>
        <span className="stat__hint">
          {isToday && stats.next_free ? `free until ${formatTime(stats.next_free.until)}` : "No live status for this day"}
        </span>
      </div>
    </section>
  );
}
