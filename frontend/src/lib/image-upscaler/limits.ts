/** What the upscaler accepts: the backend's upload limit and the models' formats. */
export const MAX_UPSCALE_BYTES = 20 * 1024 * 1024;
export const MAX_UPSCALE_EDGE = 8192;
export const MAX_UPSCALE_PIXELS = 32 * 1024 * 1024;
export const MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export function isWithinUpscaleLimits(width: number, height: number): boolean {
  return (
    Number.isSafeInteger(width) &&
    Number.isSafeInteger(height) &&
    width > 0 &&
    height > 0 &&
    width <= MAX_UPSCALE_EDGE &&
    height <= MAX_UPSCALE_EDGE &&
    width * height <= MAX_UPSCALE_PIXELS
  );
}

export function isSupportedUpscaleContentType(value: string): boolean {
  return MIME_TYPES.some((type) => type === value);
}
