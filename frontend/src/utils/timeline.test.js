import { describe, expect, it } from "vitest";
import { blockPosition, formatHourLabel, hourAt, visibleHours } from "./timeline";

const grid = { date: "2026-11-02", startHour: 8, endHour: 20, hourWidth: 100 };
const local = (hhmm) => new Date(`2026-11-02T${hhmm}:00`).toISOString();

describe("visibleHours", () => {
  it("spans the earliest opening to the latest closing", () => {
    const locations = [
      { opens_at: "08:00:00", closes_at: "20:00:00" },
      { opens_at: "07:00:00", closes_at: "21:00:00" },
    ];
    expect(visibleHours(locations)).toEqual([7, 21]);
  });

  it("rounds a half-hour closing time up", () => {
    expect(visibleHours([{ opens_at: "09:00:00", closes_at: "18:30:00" }])).toEqual([9, 19]);
  });
});

describe("blockPosition", () => {
  it("places a 10:00–12:00 booking at 2h with a 2h width", () => {
    expect(blockPosition(local("10:00"), local("12:00"), grid)).toEqual({ left: 200, width: 200 });
  });

  it("handles half hours", () => {
    expect(blockPosition(local("09:30"), local("10:00"), grid)).toEqual({ left: 150, width: 50 });
  });

  it("clips bookings that start before the grid", () => {
    expect(blockPosition(local("07:00"), local("09:00"), grid)).toEqual({ left: 0, width: 100 });
  });
});

describe("hourAt", () => {
  it("maps a click position to an hour", () => {
    expect(hourAt(250, grid)).toBe(10);
  });
});

describe("formatHourLabel", () => {
  it("uses 12-hour labels", () => {
    expect(formatHourLabel(7)).toBe("7 AM");
    expect(formatHourLabel(12)).toBe("12 PM");
    expect(formatHourLabel(15)).toBe("3 PM");
  });
});
