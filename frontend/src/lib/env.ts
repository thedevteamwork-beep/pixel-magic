function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

/**
 * Next.js only inlines literal `process.env.NEXT_PUBLIC_…` reads, so each
 * variable is read by its full name. Call this when needed, not at import.
 */
export function publicEnv(): {
  apiUrl: string;
  supabaseUrl: string;
  supabasePublishableKey: string;
} {
  const apiUrl = required(
    "NEXT_PUBLIC_API_URL",
    process.env.NEXT_PUBLIC_API_URL,
  );
  return {
    apiUrl: apiUrl.replace(/\/$/, ""),
    supabaseUrl: required(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
    supabasePublishableKey: required(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
  };
}
