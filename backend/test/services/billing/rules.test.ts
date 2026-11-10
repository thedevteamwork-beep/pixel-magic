import { describe, expect, it } from "vitest";
import type { PlanRow } from "../../../src/db/rows.js";
import {
  describeAction,
  getAction,
  getChangeType,
  paddleInterval,
  planGrantExpiry,
  toCents,
  type ChangeType,
} from "../../../src/services/billing/rules.js";

const NOW = new Date("2026-01-01T00:00:00Z");
function plan(
  name: string,
  display: string,
  priority: number,
  interval: "monthly" | "yearly",
  amount: string,
): PlanRow {
  return {
    id: name,
    name,
    display,
    description: "",
    priority,
    interval,
    amount,
    currency: "USD",
    credit_validity_days: null,
    custom: false,
    archived: false,
    paddle_product_id: null,
    paddle_price_id: null,
    metadata: {},
    created_at: NOW,
    updated_at: NOW,
  };
}

const P: Record<string, PlanRow> = {
  free: plan("free", "Free", 0, "monthly", "0.00"),
  starter_monthly: plan("starter_monthly", "Starter", 1, "monthly", "10.00"),
  starter_yearly: plan("starter_yearly", "Starter", 1, "yearly", "100.00"),
  pro_monthly: plan("pro_monthly", "Pro", 2, "monthly", "30.00"),
  pro_yearly: plan("pro_yearly", "Pro", 2, "yearly", "300.00"),
  pro_monthly_v2: plan("pro_monthly_v2", "Pro", 2, "monthly", "35.00"),
  pro_monthly_v3: plan("pro_monthly_v3", "Pro", 2, "monthly", "25.00"),
};

describe("billing rules", () => {
  it.each([
    ["free", "starter_monthly", "new", "now"],
    ["starter_monthly", "pro_monthly", "upgrade", "now"],
    ["pro_monthly", "pro_yearly", "upgrade", "now"],
    ["pro_yearly", "pro_monthly", "downgrade", "now"],
    ["pro_yearly", "starter_yearly", "downgrade", "now"],
    ["pro_monthly", "starter_yearly", "downgrade", "now"],
    ["pro_monthly", "starter_monthly", "downgrade", "period_end"],
    ["pro_monthly", "pro_monthly_v2", "upgrade", "now"],
    ["pro_monthly", "pro_monthly_v3", "downgrade", "period_end"],
    ["pro_monthly", "free", "cancel", "period_end"],
  ])("%s → %s is %s / %s", (from, to, type, action) => {
    expect(getChangeType(P[from], P[to], "free")).toBe(type);
    expect(getAction(P[from], P[to], type as Exclude<ChangeType, "same">)).toBe(
      action,
    );
  });

  it("same plan is same", () => {
    expect(getChangeType(P.pro_monthly, P.pro_monthly, "free")).toBe("same");
    expect(getChangeType(P.free, P.free, "free")).toBe("same");
  });

  it("describes actions exactly", () => {
    expect(describeAction(P.starter_monthly, "period_end")).toBe(
      "You'll be moved to the Starter plan at the end of your current billing cycle.",
    );
    expect(describeAction(P.pro_monthly, "now")).toBe(
      "You'll be moved to the Pro plan immediately.",
    );
  });

  it("plan grant expiry: period end + grace, or validity days + grace", () => {
    const s = new Date("2026-03-10T00:00:00Z");
    const e = new Date("2026-04-10T00:00:00Z");
    expect(
      planGrantExpiry(
        { ...P.pro_monthly, credit_validity_days: null },
        s,
        e,
        60,
      ).toISOString(),
    ).toBe("2026-04-10T01:00:00.000Z");
    expect(
      planGrantExpiry(
        { ...P.pro_monthly, credit_validity_days: 90 },
        s,
        e,
        60,
      ).toISOString(),
    ).toBe("2026-06-08T01:00:00.000Z");
  });

  it("toCents is exact", () => {
    expect(["9.99", "300.00", "0.10", "10", "0.00"].map(toCents)).toEqual([
      "999",
      "30000",
      "10",
      "1000",
      "0",
    ]);
  });

  it("paddleInterval maps plan interval", () => {
    expect(paddleInterval(P.pro_monthly)).toBe("month");
    expect(paddleInterval(P.pro_yearly)).toBe("year");
  });
});
