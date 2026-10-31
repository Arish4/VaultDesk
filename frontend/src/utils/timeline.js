// Pure maths for the calendar grid: which hours to show and where each booking sits.

const hourOf = (hhmmss) => Number(hhmmss.split(":")[0]);

/** "18:30:00" → 19: a column must exist for the last, partly used hour. */
const hourCeil = (hhmmss) => {
  const [hours, minutes] = hhmmss.split(":").map(Number);
  return minutes > 0 ? hours + 1 : hours;
};

/** Earliest opening to latest closing across the buildings shown, e.g. [7, 21]. */
export function visibleHours(locations, fallback = [8, 20]) {
  if (!locations.length) return fallback;
  const start = Math.min(...locations.map((l) => hourOf(l.opens_at)));
  const end = Math.max(...locations.map((l) => hourCeil(l.closes_at)));
  return [start, end];
}

/** Minutes between the start of the grid (date at startHour, local time) and an ISO time. */
export function minutesFromGridStart(iso, date, startHour) {
  const gridStart = new Date(`${date}T${String(startHour).padStart(2, "0")}:00:00`);
  return (new Date(iso) - gridStart) / 60_000;
}

/** Pixel position of a booking block, clipped to the visible grid. */
export function blockPosition(startIso, endIso, { date, startHour, endHour, hourWidth }) {
  const totalMinutes = (endHour - startHour) * 60;
  const from = Math.max(0, minutesFromGridStart(startIso, date, startHour));
  const to = Math.min(totalMinutes, minutesFromGridStart(endIso, date, startHour));
  return { left: (from / 60) * hourWidth, width: Math.max(0, ((to - from) / 60) * hourWidth) };
}

/** Which hour column a click at x pixels falls into. */
export function hourAt(x, { startHour, hourWidth }) {
  return startHour + Math.floor(x / hourWidth);
}

export function formatHourLabel(hour) {
  const suffix = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${suffix}`;
}

export const pad = (n) => String(n).padStart(2, "0");
