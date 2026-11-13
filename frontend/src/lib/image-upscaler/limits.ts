import type { UpscaleFactor, UpscaleFormat, UpscaleOutput, UpscaleSource } from "./types";

export const MAX_UPSCALE_BYTES = 20 * 1024 * 1024;
export const MAX_UPSCALE_EDGE = 8192;
export const MAX_UPSCALE_PIXELS = 32 * 1024 * 1024;
export const MAX_UPSCALE_BODY_BYTES = 4096;
export const UPSCALE_FACTORS = [1, 2, 4, 8, 16] as const;
export const LOCAL_UPSCALE_FACTORS = [1, 2, 4, 8] as const;
export const UPSCALE_FORMATS = ["png", "jpg", "webp"] as const;
export const MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const CONTENT_TYPE_BY_FORMAT: Readonly<Record<UpscaleFormat, string>> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
};

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

/** Local canvas limits, independent of any provider's model capabilities. */
export function calculateUpscaleOutput(
  source: Pick<UpscaleSource, "width" | "height">,
  factor: UpscaleFactor,
  format: UpscaleFormat = "png",
): UpscaleOutput {
  if (!isWithinUpscaleLimits(source.width, source.height)) {
    throw new Error("Choose an image up to 8,192 pixels per side and 32 megapixels.");
  }
  if (!LOCAL_UPSCALE_FACTORS.some((value) => value === factor))
    throw new Error("Choose 1×, 2×, 4×, or 8×. 16× is not available in this preview.");
  if (!UPSCALE_FORMATS.some((value) => value === format))
    throw new Error("Choose PNG, JPG, or WebP for your download.");
  const width = source.width * factor;
  const height = source.height * factor;
  if (!isWithinUpscaleLimits(width, height)) {
    throw new Error(
      `This image would be too large at ${factor}×. Try a lower factor or a smaller image. Downloads are limited to 8,192 pixels per side and 32 megapixels.`,
    );
  }
  return { width, height, contentType: CONTENT_TYPE_BY_FORMAT[format], format };
}
