import { defineFalModel, imageUrls } from "../../../falModel.js";
import { schema } from "./schema.js";

// Ported from Pixelbin's gpt2 plugin.
const APP = "openai/gpt-image-2";

// fal takes an exact size, so each resolution is a pixel budget shaped by the aspect ratio.
const OUTPUT_RESOLUTION_PIXELS: Record<string, number> = {
  "1K": 1024 * 1024,
  "2K": 2560 * 1440,
  "4K": 3840 * 2160,
};
// fal wants both sides a multiple of 16 and neither above 3840.
const DIMENSION_MULTIPLE = 16;
const MAX_DIMENSION = 3840;

const toDimensionMultiple = (value: number) =>
  Math.max(
    DIMENSION_MULTIPLE,
    Math.floor(value / DIMENSION_MULTIPLE) * DIMENSION_MULTIPLE,
  );

/**
 * The width and height for the aspect ratio at the resolution's pixel budget.
 * Every schema ratio and resolution lands inside fal's pixel and ratio limits.
 */
export function gpt2ImageSize(
  aspectRatio: string,
  outputResolution: string,
): { width: number; height: number } {
  const [w, h] = aspectRatio.split(":").map(Number);
  const ratio = w! / h!;
  const targetPixels =
    OUTPUT_RESOLUTION_PIXELS[outputResolution] ??
    OUTPUT_RESOLUTION_PIXELS["1K"]!;
  let width = Math.sqrt(targetPixels * ratio);
  let height = Math.sqrt(targetPixels / ratio);
  const longest = Math.max(width, height);
  if (longest > MAX_DIMENSION) {
    width *= MAX_DIMENSION / longest;
    height *= MAX_DIMENSION / longest;
  }
  return {
    width: toDimensionMultiple(width),
    height: toDimensionMultiple(height),
  };
}

export const gpt2Generate = defineFalModel({
  plugin: "gpt2",
  operation: "generate",
  schema,
  // References make it an edit.
  endpoint: (input) => (imageUrls(input.images).length ? `${APP}/edit` : APP),
  app: APP,
  payload: (input) => {
    const images = imageUrls(input.images);
    return {
      prompt: input.prompt,
      image_size: gpt2ImageSize(
        input.aspect_ratio as string,
        input.output_resolution as string,
      ),
      quality: input.quality,
      num_images: 1,
      sync_mode: false,
      ...(images.length ? { image_urls: images } : {}),
    };
  },
  output: "images",
  // As Pixelbin bills it: resolution and quality pick the tier, and each reference image is metered.
  billing: ({ options, uploadCount }) => ({
    ...options,
    image: uploadCount > 0,
    images: uploadCount,
  }),
});
