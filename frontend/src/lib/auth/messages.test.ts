import { describe, expect, it } from "vitest";
import { authErrorMessage, validateAuthForm } from "./messages";

const valid = { email: "  creator@example.com  ", password: "password", confirmPassword: "password" };

describe("auth form validation", () => {
  it("allows a nonempty legacy short password at login while enforcing new-password length", () => {
    const values = { ...valid, password: "old", confirmPassword: "old" };

    expect(validateAuthForm("sign-in", values)).toEqual({});
    expect(validateAuthForm("sign-up", values).password).toBeDefined();
    expect(validateAuthForm("reset-password", values).password).toBeDefined();
  });

  it("accepts eight-character new passwords without silently trimming them", () => {
    const values = { ...valid, password: " secret ", confirmPassword: " secret " };

    expect(validateAuthForm("sign-up", values)).toEqual({});
    expect(validateAuthForm("reset-password", values)).toEqual({});
  });

  it("requires an exact password confirmation only when setting a recovered password", () => {
    expect(validateAuthForm("reset-password", { ...valid, confirmPassword: "password " })).toEqual({
      confirmPassword: "Your passwords don’t match yet.",
    });
    expect(validateAuthForm("reset-password", { ...valid, email: "" })).toEqual({});
  });

  it("requires a password for login but does not require one to request a reset", () => {
    const values = { ...valid, password: "", confirmPassword: "" };

    expect(validateAuthForm("sign-in", values)).toEqual({ password: "Enter your password." });
    expect(validateAuthForm("forgot-password", values)).toEqual({});
  });

  it.each(["", "creator", "creator@", "creator@example", "person name@example.com"])(
    "rejects invalid email %j before login, signup, or reset-email submission",
    (email) => {
      for (const mode of ["sign-in", "sign-up", "forgot-password"] as const) {
        expect(validateAuthForm(mode, { ...valid, email }).email).toBe("Enter a valid email address.");
      }
    },
  );
});

describe("auth error messages", () => {
  it("gives useful credential and confirmation guidance without surfacing provider diagnostics", () => {
    expect(authErrorMessage({ code: "invalid_credentials", message: "PRIVATE PROVIDER DIAGNOSTIC" })).toBe(
      "That email and password don’t match. Check them and try again.",
    );
    expect(authErrorMessage({ code: "email_not_confirmed" })).toContain("Confirm your email");
  });

  it("uses the same neutral account-creation guidance for duplicate-account responses", () => {
    const emailExists = authErrorMessage({ code: "email_exists", message: "creator@example.com exists" });
    expect(emailExists).toBe(authErrorMessage({ code: "user_already_exists" }));
    expect(emailExists).not.toContain("creator@example.com");
    expect(emailExists).not.toMatch(/already exists/i);
  });

  it.each([{ code: "over_email_send_rate_limit" }, { code: "over_request_rate_limit" }, { status: 429 }])(
    "recognizes rate limits from either a provider code or HTTP status: %j",
    (error) => {
      expect(authErrorMessage(error)).toBe("A few too many attempts. Wait a minute, then try again.");
    },
  );

  it.each([new TypeError("Failed to fetch private endpoint"), { name: "AuthRetryableFetchError" }])(
    "turns network failures into connection guidance",
    (error) => expect(authErrorMessage(error)).toBe("We couldn’t connect. Check your connection and try again."),
  );

  it.each(["otp_expired", "session_not_found", "session_expired", "refresh_token_not_found"])(
    "recognizes unusable confirmation/recovery sessions: %s",
    (code) => expect(authErrorMessage({ code })).toBe("This link has expired. Request a fresh link to continue."),
  );

  it.each([
    new Error("Sensitive server diagnostic"),
    { code: "unrecognized_provider_code", message: "Sensitive server diagnostic" },
    null,
    undefined,
    "private diagnostic",
  ])("keeps unexpected failures generic", (error) =>
    expect(authErrorMessage(error)).toBe("Something interrupted that attempt. Please try again."),
  );
});
