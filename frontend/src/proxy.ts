import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseEnabled, publicEnv } from "@/lib/env";

/** Supabase requires no-cache headers on any response that sets auth cookies. */
function setHeaders(response: NextResponse, headers: Record<string, string>) {
  for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
}

/** Stateless UI previews that never need a session or a real provider connection. */
const DEMO_API_PATHS = new Set(["/api/demo/image-generation", "/api/demo/video-generation", "/api/demo/image-upscale"]);

/** Pages that need a signed-in user. */
const PROTECTED_PREFIXES = ["/generate", "/account", "/checkout", "/creations", "/test"];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"));
}

/** Refreshes the Supabase session cookie and keeps signed-out users off the protected pages. */
export async function proxy(request: NextRequest) {
  // The stateless UI preview never needs a session or a real provider connection.
  if (DEMO_API_PATHS.has(request.nextUrl.pathname)) return NextResponse.next();
  // Supabase is off: there is no session to refresh and nobody to keep out.
  if (!isSupabaseEnabled()) return NextResponse.next();

  const env = publicEnv();
  let response = NextResponse.next({ request });
  let latestCacheHeaders: Record<string, string> = {};

  const supabase = createServerClient(env.supabaseUrl, env.supabasePublishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, cacheHeaders) => {
        latestCacheHeaders = cacheHeaders;
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        setHeaders(response, cacheHeaders);
      },
    },
  });

  // getUser() asks Supabase to verify the session; getSession() would trust the cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtected(request.nextUrl.pathname)) {
    const next = request.nextUrl.pathname + request.nextUrl.search;
    const redirect = NextResponse.redirect(new URL(`/sign-in?next=${encodeURIComponent(next)}`, request.url));
    redirect.headers.set("Cache-Control", "private, no-store");
    // Carry over any cookies Supabase just cleared or refreshed.
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    setHeaders(redirect, latestCacheHeaders);
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|mp4|webm)$).*)"],
};
