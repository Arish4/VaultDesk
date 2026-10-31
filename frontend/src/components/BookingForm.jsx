import { useMemo, useState } from "react";
import { firstFreeStart, formatPrice, halfHourSlots, hoursBetween, overlaps, toIso } from "../utils/time";
import { Button } from "./Button";
import { EmptyState, ErrorMessage } from "./StatusMessage";

/**
 * Booking form used by the room page and the calendar dialog.
 * `booked` = times already taken that day, used for instant feedback before calling the API.
 */
export function BookingForm({ space, opensAt, closesAt, date, booked, initialStart, onSubmit, submitLabel = "Confirm booking" }) {
  const slots = useMemo(() => halfHourSlots(opensAt, closesAt), [opensAt, closesAt]);
  // Open on the first slot that can actually be booked, never on a past or taken time.
  const suggested = useMemo(
    () => firstFreeStart(slots, date, booked, { preferred: initialStart }) ?? firstFreeStart(slots, date, booked),
    // Only for the first render: the user's choice wins after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [start, setStart] = useState(suggested ?? slots[0]);
  const [end, setEnd] = useState(slots[Math.min(slots.indexOf(suggested ?? slots[0]) + 2, slots.length - 1)]);
  const [title, setTitle] = useState("");
  const [attendees, setAttendees] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (suggested === null) {
    return <EmptyState title="No free time left on this day.">Pick another date to book {space.name}.</EmptyState>;
  }

  // Derived values are calculated from state on each render, never stored in more state.
  const startIso = toIso(date, start);
  const endIso = toIso(date, end);
  const hours = hoursBetween(startIso, endIso);
  const clash = booked.some((slot) => overlaps(startIso, endIso, slot.start_at, slot.end_at));
  const problem =
    hours <= 0 ? "End time must be after start time."
      : clash ? "Part of this time is already booked."
        : new Date(startIso) < new Date() ? "This time has already passed."
          : attendees > space.capacity ? `${space.name} fits ${space.capacity} people.`
            : null;

  function changeStart(value) {
    setStart(value);
    // Keep the same length when the start moves, so the end never lands before the start.
    const length = Math.max(1, slots.indexOf(end) - slots.indexOf(start));
    setEnd(slots[Math.min(slots.indexOf(value) + length, slots.length - 1)]);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ startAt: startIso, endAt: endIso, title, attendees: Number(attendees) });
    } catch (err) {
      setError(err); // e.g. 409 if someone else booked it a moment ago
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="booking-form" onSubmit={handleSubmit}>
      <label>
        What's it for?
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Sprint planning" maxLength={120} />
      </label>
      <div className="form-row">
        <label>
          From
          <select value={start} onChange={(e) => changeStart(e.target.value)}>
            {slots.slice(0, -1).map((slot) => (
              <option key={slot}>{slot}</option>
            ))}
          </select>
        </label>
        <label>
          To
          <select value={end} onChange={(e) => setEnd(e.target.value)}>
            {slots.slice(1).map((slot) => (
              <option key={slot}>{slot}</option>
            ))}
          </select>
        </label>
        <label>
          People
          <input type="number" min="1" max={space.capacity} value={attendees} onChange={(e) => setAttendees(e.target.value)} />
        </label>
      </div>

      <div className="price-line">
        <span>{hours > 0 ? `${hours} h × ${formatPrice(space.hourly_price)}` : "—"}</span>
        <strong>{hours > 0 ? formatPrice(hours * space.hourly_price) : "—"}</strong>
      </div>

      {space.requires_approval && (
        <p className="notice">This room needs a manager's approval. Your request will show as pending until then.</p>
      )}
      {problem && <p className="hint hint--warn">{problem}</p>}
      <ErrorMessage error={error} />
      <Button type="submit" loading={submitting} disabled={Boolean(problem)}>
        {space.requires_approval ? "Request booking" : submitLabel}
      </Button>
    </form>
  );
}
