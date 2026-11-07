import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";

/** Refreshes the Supabase session cookie and keeps signed-out users off /generate. */
export async function proxy(request: NextRequest) {
  const env = publicEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.supabaseUrl, env.supabasePublishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  // getUser() asks Supabase to verify the session; getSession() would trust the cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && request.nextUrl.pathname.startsWith("/generate")) {
    const next = request.nextUrl.pathname + request.nextUrl.search;
    const redirect = NextResponse.redirect(new URL(`/sign-in?next=${encodeURIComponent(next)}`, request.url));
    // Carry over any cookies Supabase just cleared or refreshed.
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
