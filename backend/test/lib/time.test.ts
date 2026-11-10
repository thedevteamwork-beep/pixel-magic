import { describe, expect, it } from "vitest";
import { addDays, addMinutes, addMonths } from "../../src/lib/time.js";

describe("time helpers", () => {
  it("addMonths clamps to month end", () => {
    expect(addMonths(new Date("2026-01-31T10:00:00Z"), 1).toISOString()).toBe(
      "2026-02-28T10:00:00.000Z",
    );
    expect(addMonths(new Date("2028-01-31T10:00:00Z"), 1).toISOString()).toBe(
      "2028-02-29T10:00:00.000Z",
    );
    expect(addMonths(new Date("2026-03-15T00:00:00Z"), 12).toISOString()).toBe(
      "2027-03-15T00:00:00.000Z",
    );
  });
  it("addDays and addMinutes", () => {
    expect(addDays(new Date("2026-03-10T00:00:00Z"), 30).toISOString()).toBe(
      "2026-04-09T00:00:00.000Z",
    );
    expect(addMinutes(new Date("2026-03-10T00:00:00Z"), 60).toISOString()).toBe(
      "2026-03-10T01:00:00.000Z",
    );
  });
});
