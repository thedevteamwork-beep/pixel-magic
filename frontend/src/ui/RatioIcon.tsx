import { cn } from "@/lib/cn";

/** "16:9" → 16/9; "2.35:1" → 2.35; anything else → 1. */
function ratioOf(ratio: string): number {
  const [width, height] = ratio.split(":").map(Number);
  return width > 0 && height > 0 ? width / height : 1;
}

/** A small outline in the shape of an aspect ratio, e.g. a tall box for "9:16". Decorative. */
export function RatioIcon({ ratio, size = 14, className }: { ratio: string; size?: number; className?: string }) {
  const value = ratioOf(ratio);
  const width = Math.max(5, Math.round(value >= 1 ? size : size * value));
  const height = Math.max(5, Math.round(value >= 1 ? size / value : size));
  return (
    <span
      aria-hidden="true"
      className={cn("inline-grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <span className="block rounded-[3px] border-[1.5px] border-current" style={{ width, height }} />
    </span>
  );
}
