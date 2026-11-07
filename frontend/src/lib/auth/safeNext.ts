const DEFAULT_NEXT = "/generate";

/** A same-site path to go to after sign-in; anything else becomes `/generate`. */
export function safeNext(next: string | null | undefined): string {
  if (!next) return DEFAULT_NEXT;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return DEFAULT_NEXT;
  if (next.includes("://")) return DEFAULT_NEXT;
  return next;
}
