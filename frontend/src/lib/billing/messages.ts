import { ApiError } from "@/lib/api/client";

const FALLBACK = "Something went wrong. Try again.";

export function billingErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return FALLBACK;

  switch (error.code) {
    case "ALREADY_ON_PLAN":
      return "You're already on this plan.";
    case "PAYMENT_PAST_DUE":
      return "Your last payment failed. Update your payment method first.";
    case "PAYMENT_PROVIDER_ERROR":
      return "The payment service didn't respond. Try again in a minute.";
    case "RENEWAL_IN_PROGRESS":
      return "Your plan is renewing right now. Try again in a few minutes.";
    case "PLAN_NOT_AVAILABLE":
    case "ADDON_NOT_AVAILABLE":
      return "That option isn't available any more.";
    case "NO_SCHEDULED_CHANGE":
      return "There's no scheduled change to undo.";
    case "VALIDATION_FAILED":
      return error.message;
    case "NETWORK_ERROR":
      return "Can't reach Pixel Magic. Check your connection and try again.";
    default:
      return FALLBACK;
  }
}
