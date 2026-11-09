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

/**
 * Separate from publicEnv() so pages that don't use Paddle don't need the token.
 * The client-side token is public by design; it is never the API key.
 */
export function paddleEnv(): {
  clientToken: string;
  environment: "sandbox" | "production";
} {
  const clientToken = required(
    "NEXT_PUBLIC_PADDLE_CLIENT_TOKEN",
    process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
  );
  const environment = process.env.NEXT_PUBLIC_PADDLE_ENV || "sandbox";
  if (environment !== "sandbox" && environment !== "production") {
    throw new Error(
      `NEXT_PUBLIC_PADDLE_ENV must be "sandbox" or "production", got "${environment}"`,
    );
  }
  return { clientToken, environment };
}
