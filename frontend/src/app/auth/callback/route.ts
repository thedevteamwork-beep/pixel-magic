import { NextResponse } from "next/server";
import { safeNext } from "@/lib/auth/safeNext";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Where Supabase sends the user after email confirmation or Google sign-in. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));

  if (code) {
    let cacheHeaders: Record<string, string> = {};
    const supabase = await createSupabaseServerClient((headers) => {
      cacheHeaders = headers;
    });
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const response = NextResponse.redirect(new URL(next, url.origin));
      for (const [key, value] of Object.entries(cacheHeaders)) response.headers.set(key, value);
      return response;
    }
  }
  return NextResponse.redirect(new URL("/sign-in?error=1", url.origin));
}
