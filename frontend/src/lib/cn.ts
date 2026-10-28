import { twMerge } from "tailwind-merge";

type ClassValue = string | false | null | undefined;

/**
 * Joins class names, skipping falsy values. Conflicting Tailwind classes are
 * resolved in favour of the later one, so a `className` override always wins
 * (e.g. cn("size-5", "size-4") → "size-4").
 */
export function cn(...classes: ClassValue[]): string {
  return twMerge(classes.filter(Boolean).join(" "));
}
