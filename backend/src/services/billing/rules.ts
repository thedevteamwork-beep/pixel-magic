import type { PlanRow } from "../../db/rows.js";
import { addDays, addMinutes } from "../../lib/time.js";

export type ChangeType = "new" | "upgrade" | "downgrade" | "cancel" | "same";
export type Action = "now" | "period_end";

/** Converts a decimal string ("9.99", "10", "0.10") to integer cents using string arithmetic only. */
export function toCents(amount: string): string {
  const m = /^(\d+)(?:\.(\d*))?$/.exec(amount.trim());
  if (!m) throw new Error(`Invalid amount: ${amount}`);
  const frac = (m[2] ?? "").padEnd(2, "0");
  if (/[1-9]/.test(frac.slice(2))) {
    throw new Error(`Amount has more than 2 decimal places: ${amount}`);
  }
  return BigInt(m[1] + frac.slice(0, 2)).toString();
}

export function getChangeType(
  from: PlanRow,
  to: PlanRow,
  freePlanName: string,
): ChangeType {
  if (from.id === to.id) return "same";
  if (to.name === freePlanName) return "cancel";
  if (from.name === freePlanName) return "new";
  if (to.priority !== from.priority) {
    return to.priority > from.priority ? "upgrade" : "downgrade";
  }
  if (from.interval !== to.interval) {
    return from.interval === "monthly" ? "upgrade" : "downgrade";
  }
  return BigInt(toCents(to.amount)) > BigInt(toCents(from.amount))
    ? "upgrade"
    : "downgrade";
}

export function getAction(
  from: PlanRow,
  to: PlanRow,
  changeType: Exclude<ChangeType, "same">,
): Action {
  switch (changeType) {
    case "new":
    case "upgrade":
      return "now";
    case "cancel":
      return "period_end";
    case "downgrade":
      return from.interval === "yearly" || from.interval !== to.interval
        ? "now"
        : "period_end";
  }
}

export function describeAction(to: PlanRow, action: Action): string {
  return action === "now"
    ? `You'll be moved to the ${to.display} plan immediately.`
    : `You'll be moved to the ${to.display} plan at the end of your current billing cycle.`;
}

export function planGrantExpiry(
  plan: PlanRow,
  periodStart: Date,
  periodEnd: Date,
  graceMinutes: number,
): Date {
  const base = plan.credit_validity_days
    ? addDays(periodStart, plan.credit_validity_days)
    : periodEnd;
  return addMinutes(base, graceMinutes);
}

export function paddleInterval(plan: PlanRow): "month" | "year" {
  return plan.interval === "yearly" ? "year" : "month";
}
