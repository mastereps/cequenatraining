import { describe, expect, it } from "vitest";
import { formatManilaDateTime, formatSeatLabel } from "./format";

describe("formatSeatLabel", () => {
  it.each([
    [null, "Unlimited seats"],
    [0, "Fully booked"],
    [-1, "Fully booked"],
    [1, "1 seat left"],
    [2, "2 seats left"],
  ])("formats %s available seats", (availableSeats, expected) => {
    expect(formatSeatLabel(availableSeats)).toBe(expected);
  });
});

describe("formatManilaDateTime", () => {
  it("formats UTC timestamps in Asia/Manila time", () => {
    expect(formatManilaDateTime("2026-06-02T00:00:00.000Z")).toContain("8:00 AM");
  });
});
