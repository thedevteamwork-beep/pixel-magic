import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Pixel Magic home">
      <span className="flex size-7 items-center justify-center rounded-md bg-secondary font-display text-xs font-bold text-secondary-foreground">
        PM
      </span>
      <span className="font-display text-sm font-bold uppercase tracking-tight">Pixel Magic</span>
    </Link>
  );
}
