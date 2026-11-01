import { describe, expect, it } from "vitest";
import { firstFreeStart, halfHourSlots, hoursBetween, overlaps } from "./time";

describe("firstFreeStart", () => {
  const slots = halfHourSlots("08:00:00", "12:00:00");
  const date = "2026-11-02";
  const at = (hhmm: string) => new Date(`${date}T${hhmm}:00`);
  const booking = (from: string, to: string) => ({ start_at: at(from).toISOString(), end_at: at(to).toISOString() });

  it("skips times that have already passed", () => {
    expect(firstFreeStart(slots, date, [], { now: at("09:10") })).toBe("09:30");
  });

  it("skips booked time", () => {
    expect(firstFreeStart(slots, date, [booking("09:30", "10:30")], { now: at("09:10") })).toBe("10:30");
  });

  it("starts searching from the preferred slot", () => {
    expect(firstFreeStart(slots, date, [], { preferred: "10:00", now: at("07:00") })).toBe("10:00");
  });

  it("returns null when the day is over", () => {
    expect(firstFreeStart(slots, date, [], { now: at("11:45") })).toBeNull();
  });
});

describe("halfHourSlots", () => {
  it("lists every half hour between opening and closing, inclusive", () => {
    expect(halfHourSlots("08:00:00", "10:00:00")).toEqual(["08:00", "08:30", "09:00", "09:30", "10:00"]);
  });
});

describe("overlaps", () => {
  const at = (h: number) => `2026-11-02T${String(h).padStart(2, "0")}:00:00Z`;

  it("detects a partial overlap", () => {
    expect(overlaps(at(10), at(12), at(11), at(13))).toBe(true);
  });

  it("treats back-to-back bookings as free", () => {
    expect(overlaps(at(10), at(11), at(11), at(12))).toBe(false);
  });
});

describe("hoursBetween", () => {
  it("returns fractional hours", () => {
    expect(hoursBetween("2026-11-02T10:00:00Z", "2026-11-02T11:30:00Z")).toBe(1.5);
  });
});
