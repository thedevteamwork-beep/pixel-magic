import type { ImageSize } from "../lib/imageSize.js";

/** Formats an upscaler accepts, as every image model here does. */
export const UPSCALE_INPUT_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

/**
 * Megapixels of the result: the input's size scaled by `scale` on each side.
 * Upscalers are priced on it (Pixelbin's `output_megapixels`). Without a size
 * (only when the facts' types are being worked out) it is 1 MP scaled.
 */
export function outputMegapixels(
  size: ImageSize | undefined,
  scale: number,
): number {
  const pixels = size ? size.width * size.height : 1_000_000;
  return Math.round((pixels * scale * scale) / 10_000) / 100;
}
