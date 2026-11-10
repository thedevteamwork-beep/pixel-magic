const DEFAULT_NEXT = "/";

/** A same-site path to return to after authentication; otherwise go to the landing page. */
export function safeNext(next: string | null | undefined): string {
  if (!next) return DEFAULT_NEXT;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return DEFAULT_NEXT;
  if (next.includes("://")) return DEFAULT_NEXT;
  // URL parsers drop tabs and newlines, so "/\t/evil.com" would become "//evil.com".
  if (/[\u0000-\u001F\u007F]/.test(next)) return DEFAULT_NEXT;
  // Final guard: the path must resolve to our own origin.
  if (new URL(next, "http://n").origin !== "http://n") return DEFAULT_NEXT;
  return next;
}
