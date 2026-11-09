import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/client";
import { billingErrorMessage } from "@/lib/billing/messages";

const cases: [string, string][] = [
  ["ALREADY_ON_PLAN", "You're already on this plan."],
  ["PAYMENT_PAST_DUE", "Your last payment failed. Update your payment method first."],
  ["PAYMENT_PROVIDER_ERROR", "The payment service didn't respond. Try again in a minute."],
  ["RENEWAL_IN_PROGRESS", "Your plan is renewing right now. Try again in a few minutes."],
  ["PLAN_NOT_AVAILABLE", "That option isn't available any more."],
  ["ADDON_NOT_AVAILABLE", "That option isn't available any more."],
  ["NO_SCHEDULED_CHANGE", "There's no scheduled change to undo."],
  ["VALIDATION_FAILED", "server text"],
  ["NETWORK_ERROR", "Can't reach Pixel Magic. Check your connection and try again."],
  ["SOMETHING_ELSE", "Something went wrong. Try again."],
];

describe("billingErrorMessage", () => {
  it.each(cases)("maps %s", (code, message) => {
    expect(billingErrorMessage(new ApiError(400, code, "server text"))).toBe(message);
  });

  it("falls back for a non-ApiError", () => {
    expect(billingErrorMessage(new Error("boom"))).toBe("Something went wrong. Try again.");
    expect(billingErrorMessage("nope")).toBe("Something went wrong. Try again.");
  });
});
