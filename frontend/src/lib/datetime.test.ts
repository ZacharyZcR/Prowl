import { describe, expect, it } from "vitest";
import { formatClockTime, formatDate, formatDateTime } from "./datetime";

describe("datetime helpers", () => {
  it("returns a placeholder for empty values", () => {
    expect(formatDate()).toBe("-");
    expect(formatDateTime(null)).toBe("-");
  });

  it("falls back to the original value for invalid input", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
    expect(formatDateTime("not-a-date")).toBe("not-a-date");
  });

  it("formats valid iso timestamps", () => {
    const date = formatDate("2026-04-04T12:00:00Z");
    const dateTime = formatDateTime("2026-04-04T12:00:00Z");

    expect(date).not.toBe("-");
    expect(date).not.toBe("2026-04-04T12:00:00Z");
    expect(dateTime).not.toBe("-");
    expect(dateTime).not.toBe("2026-04-04T12:00:00Z");
  });

  it("formats clock time with optional milliseconds", () => {
    const time = formatClockTime("2026-04-04T12:00:00Z");
    const precise = formatClockTime("2026-04-04T12:00:00.123Z", true);

    expect(time).not.toBe("-");
    expect(time).not.toBe("2026-04-04T12:00:00Z");
    expect(precise).toMatch(/\d/);
    expect(precise).not.toBe("2026-04-04T12:00:00.123Z");
  });
});
