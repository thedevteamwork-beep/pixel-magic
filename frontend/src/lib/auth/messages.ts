import type { AuthMode } from "./paths";

export const MIN_PASSWORD_LENGTH = 8;
export type AuthField = "email" | "password" | "confirmPassword";
export type AuthFieldErrors = Partial<Record<AuthField, string>>;

export function validateAuthForm(mode: AuthMode, values: { email: string; password: string; confirmPassword: string }): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  if (mode !== "reset-password" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (mode !== "forgot-password") {
    if (!values.password) errors.password = "Enter your password.";
    else if (mode !== "sign-in" && values.password.length < MIN_PASSWORD_LENGTH) errors.password = "Use at least 8 characters for your password.";
  }
  if (mode === "reset-password" && values.confirmPassword !== values.password) errors.confirmPassword = "Your passwords don’t match yet.";
  return errors;
}

/** Keep provider diagnostics out of the UI; never expose account existence. */
export function authErrorMessage(error: unknown): string {
  const details = error && typeof error === "object" ? error as { code?: string; status?: number; name?: string } : {};
  switch (details.code) {
    case "invalid_credentials": return "That email and password don’t match. Check them and try again.";
    case "email_not_confirmed": return "Confirm your email before logging in. Check your inbox for the confirmation link.";
    case "user_already_exists":
    case "email_exists": return "We couldn’t create an account with these details. Try logging in or resetting your password.";
    case "weak_password": return "Choose a longer password with a mix of letters, numbers, and symbols.";
    case "same_password": return "Choose a password you haven’t used for this account.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit": return "A few too many attempts. Wait a minute, then try again.";
    case "signup_disabled": return "New accounts are temporarily unavailable. Please try again later.";
    case "provider_disabled":
    case "oauth_provider_not_supported": return "Google sign-in is currently unavailable. You can continue with your email.";
    case "otp_expired":
    case "session_not_found":
    case "session_expired":
    case "refresh_token_not_found": return "This link has expired. Request a fresh link to continue.";
  }
  if (details.status === 429) return "A few too many attempts. Wait a minute, then try again.";
  if (error instanceof TypeError || details.name === "AuthRetryableFetchError") return "We couldn’t connect. Check your connection and try again.";
  return "Something interrupted that attempt. Please try again.";
}
