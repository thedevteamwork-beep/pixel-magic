import { AuthApiError, type Session, type User } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { createAuthActions, type AuthClient } from "./actions";

const user: User = {
  id: "user-123",
  email: "creator@example.com",
  aud: "authenticated",
  app_metadata: {},
  user_metadata: {},
  created_at: "2026-11-10T00:00:00Z",
};
const session: Session = {
  user,
  access_token: "test-access-token",
  refresh_token: "test-refresh-token",
  expires_in: 3600,
  token_type: "bearer",
};
const destination = { origin: "https://pixel.example", next: "/creations?kind=video&sort=newest" };
const credentials = { email: "  creator@example.com  ", password: "  Password with spaces!  " };

function setup() {
  const provider = {
    signInWithPassword: vi.fn<AuthClient["signInWithPassword"]>(),
    signUp: vi.fn<AuthClient["signUp"]>(),
    signInWithOAuth: vi.fn<AuthClient["signInWithOAuth"]>(),
    resetPasswordForEmail: vi.fn<AuthClient["resetPasswordForEmail"]>(),
    updateUser: vi.fn<AuthClient["updateUser"]>(),
    resend: vi.fn<AuthClient["resend"]>(),
  } satisfies AuthClient;
  return { provider, actions: createAuthActions(provider) };
}

describe("createAuthActions", () => {
  it("trims the sign-in email while preserving the exact password", async () => {
    const { provider, actions } = setup();
    provider.signInWithPassword.mockResolvedValue({ data: { user, session }, error: null });

    await actions.signIn(credentials);

    expect(provider.signInWithPassword).toHaveBeenCalledWith({
      email: "creator@example.com",
      password: credentials.password,
    });
  });

  it.each([
    { session, expected: "signed-in" },
    { session: null, expected: "confirmation" },
  ] as const)(
    "returns $expected according to the actual signup session",
    async ({ session: returnedSession, expected }) => {
      const { provider, actions } = setup();
      provider.signUp.mockResolvedValue({ data: { user, session: returnedSession }, error: null });

      await expect(actions.signUp({ ...credentials, ...destination })).resolves.toBe(expected);
      expect(provider.signUp).toHaveBeenCalledWith({
        email: "creator@example.com",
        password: credentials.password,
        options: {
          emailRedirectTo: "https://pixel.example/auth/callback?next=%2Fcreations%3Fkind%3Dvideo%26sort%3Dnewest",
        },
      });
    },
  );

  it("does not turn a signup provider error into confirmation success", async () => {
    const { provider, actions } = setup();
    const error = new AuthApiError("Account rejected", 422, "weak_password");
    provider.signUp.mockResolvedValue({ data: { user: null, session: null }, error });

    await expect(actions.signUp({ ...credentials, ...destination })).rejects.toBe(error);
  });

  it("starts Google PKCE with a sanitized destination and leaves navigation to the caller", async () => {
    const { provider, actions } = setup();
    const providerUrl = "https://auth.example/authorize?provider=google";
    provider.signInWithOAuth.mockResolvedValue({ data: { provider: "google", url: providerUrl }, error: null });

    await expect(actions.google({ ...destination, next: "//outside.example" })).resolves.toBe(providerUrl);
    expect(provider.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: "https://pixel.example/auth/callback?next=%2F", skipBrowserRedirect: true },
    });
  });

  it("rejects an OAuth response that cannot navigate anywhere", async () => {
    const { provider, actions } = setup();
    provider.signInWithOAuth.mockResolvedValue({ data: { provider: "google", url: "" }, error: null });

    await expect(actions.google(destination)).rejects.toThrow("OAuth redirect unavailable");
  });

  it("preserves an OAuth provider error instead of replacing it with a missing-URL error", async () => {
    const { provider, actions } = setup();
    const error = new AuthApiError("Provider disabled", 400, "provider_disabled");
    provider.signInWithOAuth.mockResolvedValue({ data: { provider: "google", url: null }, error });

    await expect(actions.google(destination)).rejects.toBe(error);
  });

  it("keeps reset callbacks in the recovery flow with the intended post-reset destination", async () => {
    const { provider, actions } = setup();
    provider.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });

    await actions.requestReset({ email: credentials.email, ...destination });

    expect(provider.resetPasswordForEmail).toHaveBeenCalledWith("creator@example.com", {
      redirectTo: "https://pixel.example/auth/callback?next=%2Fcreations%3Fkind%3Dvideo%26sort%3Dnewest&flow=recovery",
    });
  });

  it("resends signup confirmation without accidentally creating a recovery callback", async () => {
    const { provider, actions } = setup();
    provider.resend.mockResolvedValue({ data: { user: null, session: null }, error: null });

    await actions.resendConfirmation({ email: credentials.email, ...destination, next: "https://outside.example" });

    expect(provider.resend).toHaveBeenCalledWith({
      type: "signup",
      email: "creator@example.com",
      options: { emailRedirectTo: "https://pixel.example/auth/callback?next=%2F" },
    });
  });

  it("updates the password exactly as entered", async () => {
    const { provider, actions } = setup();
    provider.updateUser.mockResolvedValue({ data: { user }, error: null });

    await actions.updatePassword(credentials.password);

    expect(provider.updateUser).toHaveBeenCalledWith({ password: credentials.password });
  });

  it("propagates reset, password update, and resend failures to prevent false success screens", async () => {
    const { provider, actions } = setup();
    const resetError = new AuthApiError("Try later", 429, "over_email_send_rate_limit");
    const updateError = new AuthApiError("Expired session", 400, "session_not_found");
    const resendError = new AuthApiError("Try later", 429, "over_email_send_rate_limit");
    provider.resetPasswordForEmail.mockResolvedValue({ data: null, error: resetError });
    provider.updateUser.mockResolvedValue({ data: { user: null }, error: updateError });
    provider.resend.mockResolvedValue({ data: { user: null, session: null }, error: resendError });

    await expect(actions.requestReset({ email: credentials.email, ...destination })).rejects.toBe(resetError);
    await expect(actions.updatePassword(credentials.password)).rejects.toBe(updateError);
    await expect(actions.resendConfirmation({ email: credentials.email, ...destination })).rejects.toBe(resendError);
  });
});
