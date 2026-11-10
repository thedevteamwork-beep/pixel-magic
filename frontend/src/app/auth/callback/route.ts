import { NextResponse } from "next/server";
import { authPath } from "@/lib/auth/paths";
import { safeNext } from "@/lib/auth/safeNext";
import { isSupabaseEnabled } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function authRedirect(path: string, origin: string, cacheHeaders: Record<string, string> = {}) {
  const response = NextResponse.redirect(new URL(path, origin));
  response.headers.set("Cache-Control", "private, no-store");
  for (const [key, value] of Object.entries(cacheHeaders)) response.headers.set(key, value);
  return response;
}

/** Completes email confirmation, Google sign-in and password recovery. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  // Supabase is off: nothing to exchange, go home.
  if (!isSupabaseEnabled()) return authRedirect("/", url.origin);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  const recovery = url.searchParams.get("flow") === "recovery";
  let cacheHeaders: Record<string, string> = {};

  try {
    if (code) {
      const supabase = await createSupabaseServerClient((headers) => {
        cacheHeaders = { ...cacheHeaders, ...headers };
      });
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return authRedirect(recovery ? authPath("reset-password", next) : next, url.origin, cacheHeaders);
      }
    }
  } catch {
    // Expired links, missing PKCE verifiers and temporary auth failures can be retried from the form.
  }
  const failurePath = authPath(recovery ? "forgot-password" : "sign-in", next);
  return authRedirect(`${failurePath}&error=1`, url.origin, cacheHeaders);
}
