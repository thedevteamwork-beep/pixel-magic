import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";

export function createSupabaseBrowserClient() {
  const env = publicEnv();
  if (!env.supabaseEnabled) {
    throw new Error("Supabase is turned off (NEXT_PUBLIC_SUPABASE_ENABLED=false)");
  }
  return createBrowserClient(env.supabaseUrl, env.supabasePublishableKey);
}
