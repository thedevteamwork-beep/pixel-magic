import { describe, expect, it } from "vitest";
import { formatMoney } from "@/lib/billing/money";

describe("formatMoney", () => {
  it("formats dollars", () => {
    expect(formatMoney("10.00", "USD")).toBe("$10.00");
    expect(formatMoney("0.00", "USD")).toBe("$0.00");
  });

  it("formats euros", () => {
    expect(formatMoney("300.00", "EUR")).toBe("€300.00");
  });
});
