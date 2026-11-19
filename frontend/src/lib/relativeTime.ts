const UNITS: readonly [unit: Intl.RelativeTimeFormatUnit, seconds: number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

/** "Just now", "5 minutes ago", "Yesterday"… */
export function relativeTime(iso: string, now = Date.now(), locale?: string): string {
  const seconds = Math.round((Date.parse(iso) - now) / 1000);
  if (!Number.isFinite(seconds)) return "";
  if (Math.abs(seconds) < 45) return "Just now";
  const format = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size || unit === "minute") {
      const text = format.format(Math.round(seconds / size), unit);
      return text[0].toUpperCase() + text.slice(1);
    }
  }
  return "";
}
