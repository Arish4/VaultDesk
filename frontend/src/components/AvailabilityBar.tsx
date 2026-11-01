import type { BookedSlot } from "../types";
import { formatTime } from "../utils/time";

interface Props {
  date: string;
  opensAt: string;
  closesAt: string;
  booked: BookedSlot[];
}

/** A day timeline: grey = free, amber = already booked. */
export function AvailabilityBar({ date, opensAt, closesAt, booked }: Props) {
  const dayStart = new Date(`${date}T${opensAt}`);
  const dayEnd = new Date(`${date}T${closesAt}`);
  const span = dayEnd.getTime() - dayStart.getTime();
  const percent = (time: string) =>
    Math.min(100, Math.max(0, ((new Date(time).getTime() - dayStart.getTime()) / span) * 100));

  return (
    <div className="availability">
      <div className="availability__bar">
        {booked.map((slot) => (
          <span
            key={slot.start_at}
            className="availability__slot"
            style={{ left: `${percent(slot.start_at)}%`, width: `${percent(slot.end_at) - percent(slot.start_at)}%` }}
            title={`${formatTime(slot.start_at)} – ${formatTime(slot.end_at)}`}
          />
        ))}
      </div>
      <div className="availability__labels">
        <span>{opensAt.slice(0, 5)}</span>
        <span>{booked.length ? `${booked.length} booking(s) this day` : "Fully free"}</span>
        <span>{closesAt.slice(0, 5)}</span>
      </div>
    </div>
  );
}
