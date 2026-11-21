/** Small helpers shared by the studios (image, video, AI influencer). */

/** A ratio like "9:16" as a CSS `aspect-ratio` value ("9 / 16"); a square for anything that isn't two positive numbers. */
export function cssAspectRatio(ratio: string): string {
  const [width, height] = ratio.split(":").map(Number);
  return width > 0 && height > 0 ? `${width} / ${height}` : "1 / 1";
}
