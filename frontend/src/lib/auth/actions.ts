import type { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { authCallbackUrl } from "./paths";

type SupabaseAuth = ReturnType<typeof createSupabaseBrowserClient>["auth"];
export type AuthClient = Pick<SupabaseAuth,
  "signInWithPassword" | "signUp" | "signInWithOAuth" | "resetPasswordForEmail" | "updateUser" | "resend"
>;
type Credentials = { email: string; password: string };
type Destination = { origin: string; next: string };

/** Provider calls stay independent of form state and can be verified in tests. */
export function createAuthActions(auth: AuthClient) {
  return {
    async signIn({ email, password }: Credentials) {
      const { error } = await auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
    },
    async signUp({ email, password, origin, next }: Credentials & Destination) {
      const { data, error } = await auth.signUp({
        email: email.trim(), password,
        options: { emailRedirectTo: authCallbackUrl(origin, next) },
      });
      if (error) throw error;
      return data.session ? "signed-in" as const : "confirmation" as const;
    },
    async google({ origin, next }: Destination) {
      const { data, error } = await auth.signInWithOAuth({
        provider: "google", options: { redirectTo: authCallbackUrl(origin, next), skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (!data.url) throw new Error("OAuth redirect unavailable");
      return data.url;
    },
    async requestReset({ email, origin, next }: { email: string } & Destination) {
      const { error } = await auth.resetPasswordForEmail(email.trim(), { redirectTo: authCallbackUrl(origin, next, true) });
      if (error) throw error;
    },
    async updatePassword(password: string) {
      const { error } = await auth.updateUser({ password });
      if (error) throw error;
    },
    async resendConfirmation({ email, origin, next }: { email: string } & Destination) {
      const { error } = await auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: authCallbackUrl(origin, next) } });
      if (error) throw error;
    },
  };
}
