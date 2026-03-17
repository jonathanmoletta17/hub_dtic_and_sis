import { describe, expect, it } from "vitest";

import {
  asIsoDateTimeString,
  compareIsoDateDesc,
  formatIsoDate,
  formatIsoDateTime,
  formatIsoTime,
  minutesSince,
  toDateOrNull,
} from "./iso";

describe("iso datetime helpers", () => {
  it("parses valid ISO datetimes", () => {
    const parsed = toDateOrNull(asIsoDateTimeString("2026-03-15T10:30:00-03:00"));

    expect(parsed).not.toBeNull();
    expect(parsed?.toISOString()).toBe("2026-03-15T13:30:00.000Z");
  });

  it("sorts by most recent datetime first", () => {
    const older = asIsoDateTimeString("2026-03-15T10:30:00-03:00");
    const newer = asIsoDateTimeString("2026-03-15T11:30:00-03:00");

    expect(compareIsoDateDesc(older, newer)).toBeGreaterThan(0);
  });

  it("formats date, time and datetime consistently", () => {
    const value = asIsoDateTimeString("2026-03-15T10:30:00-03:00");

    expect(formatIsoDate(value)).toBe("15/03/2026");
    expect(formatIsoTime(value)).toBe("10:30");
    expect(formatIsoDateTime(value)).toContain("15/03/2026");
  });

  it("computes elapsed minutes from ISO datetimes", () => {
    const value = asIsoDateTimeString("2026-03-15T10:30:00-03:00");
    const now = new Date("2026-03-15T12:00:00-03:00");

    expect(minutesSince(value, now)).toBe(90);
  });
});
