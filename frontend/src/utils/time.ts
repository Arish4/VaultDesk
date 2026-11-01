// Pure helpers for dates, slots and money. No React here, so they are easy to unit test.
import type { BookedSlot } from "../types";

export function todayISO(now: Date = new Date()): string {
  return now.toLocaleDateString("en-CA"); // YYYY-MM-DD in the browser's time zone
}

/** "2026-11-02", 1 → "2026-11-03" (works across month ends). */
export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00`); // noon avoids daylight-saving edge cases
  date.setDate(date.getDate() + days);
  return todayISO(date);
}

/** "08:00:00", "20:00:00" → ["08:00", "08:30", ..., "20:00"] */
export function halfHourSlots(opensAt: string, closesAt: string): string[] {
  const toMinutes = (value: string) => {
    const [h, m] = value.split(":").map(Number);
    return h * 60 + m;
  };
  const slots: string[] = [];
  for (let minutes = toMinutes(opensAt); minutes <= toMinutes(closesAt); minutes += 30) {
    const h = String(Math.floor(minutes / 60)).padStart(2, "0");
    const m = String(minutes % 60).padStart(2, "0");
    slots.push(`${h}:${m}`);
  }
  return slots;
}

/** Local date + "HH:MM" → ISO string in UTC, which is what the API expects. */
export function toIso(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

/** Same rule as the backend: windows overlap when each starts before the other ends. */
export function overlaps(startA: string, endA: string, startB: string, endB: string): boolean {
  return new Date(startA) < new Date(endB) && new Date(endA) > new Date(startB);
}

/**
 * The first slot (at or after `preferred`) that is in the future and not booked for the next half hour.
 * Returns null when nothing is left that day, so the form can say so instead of offering a past time.
 */
export function firstFreeStart(
  slots: string[],
  date: string,
  booked: BookedSlot[],
  { preferred, now = new Date() }: { preferred?: string; now?: Date } = {},
): string | null {
  const startIndex = preferred ? Math.max(0, slots.indexOf(preferred)) : 0;
  for (const [index, slot] of slots.slice(0, -1).entries()) {
    if (index < startIndex) continue;
    const start = toIso(date, slot);
    const end = toIso(date, slots[index + 1]);
    const isFree = !booked.some((b) => overlaps(start, end, b.start_at, b.end_at));
    if (new Date(start) >= now && isFree) return slot;
  }
  return null;
}

export function hoursBetween(startIso: string, endIso: string): number {
  return (new Date(endIso).getTime() - new Date(startIso).getTime()) / 3_600_000;
}

export function formatPrice(amount: number | string): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(amount));
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}
