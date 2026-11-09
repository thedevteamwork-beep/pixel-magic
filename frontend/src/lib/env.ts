function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

/**
 * The one switch for Supabase. It is on unless NEXT_PUBLIC_SUPABASE_ENABLED is
 * exactly "false". While it is off the app never creates a Supabase client:
 * no sign-in, no session refresh, no token on API calls, no Supabase keys
 * needed. Check this before calling createSupabaseBrowserClient or
 * createSupabaseServerClient.
 */
export function isSupabaseEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SUPABASE_ENABLED !== "false";
}

/**
 * Next.js only inlines literal `process.env.NEXT_PUBLIC_…` reads, so each
 * variable is read by its full name. Call this when needed, not at import.
 */
export function publicEnv(): {
  apiUrl: string;
  supabaseEnabled: boolean;
  supabaseUrl: string;
  supabasePublishableKey: string;
} {
  const apiUrl = required(
    "NEXT_PUBLIC_API_URL",
    process.env.NEXT_PUBLIC_API_URL,
  );
  const supabaseEnabled = isSupabaseEnabled();
  return {
    apiUrl: apiUrl.replace(/\/$/, ""),
    supabaseEnabled,
    // The keys are only needed while Supabase is on.
    supabaseUrl: supabaseEnabled
      ? required(
          "NEXT_PUBLIC_SUPABASE_URL",
          process.env.NEXT_PUBLIC_SUPABASE_URL,
        )
      : "",
    supabasePublishableKey: supabaseEnabled
      ? required(
          "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        )
      : "",
  };
}
