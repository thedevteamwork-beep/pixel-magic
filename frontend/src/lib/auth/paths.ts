import { safeNext } from "./safeNext";

export type AuthMode = "sign-in" | "sign-up" | "forgot-password" | "reset-password";

export function authPath(mode: AuthMode, next?: string | null): string {
  return `/${mode}?${new URLSearchParams({ next: safeNext(next) })}`;
}

/** The PKCE callback handles both confirmation and recovery emails. */
export function authCallbackUrl(origin: string, next?: string | null, recovery = false): string {
  const url = new URL("/auth/callback", origin);
  url.searchParams.set("next", safeNext(next));
  if (recovery) url.searchParams.set("flow", "recovery");
  return url.toString();
}
