import { NextResponse } from "next/server";
import { safeNext } from "@/lib/auth/safeNext";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Where Supabase sends the user after email confirmation or Google sign-in. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL("/sign-in?error=1", url.origin));
}
