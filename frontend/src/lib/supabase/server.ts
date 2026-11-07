import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/lib/env";

/**
 * `headers()` is read-only, so this helper cannot set response headers itself.
 * Pass `onCacheHeaders` to receive the no-cache headers Supabase requires and
 * put them on your response (see the auth callback route).
 */
export async function createSupabaseServerClient(onCacheHeaders?: (headers: Record<string, string>) => void) {
  const env = publicEnv();
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl, env.supabasePublishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet, cacheHeaders) => {
        onCacheHeaders?.(cacheHeaders);
        // Server Components cannot set cookies; the proxy refreshes the
        // session instead, so a failed write here is safe to ignore.
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {}
      },
    },
  });
}
