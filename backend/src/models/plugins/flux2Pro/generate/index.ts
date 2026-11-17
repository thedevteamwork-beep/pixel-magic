import { defineFalModel, imageUrls } from "../../../falModel.js";
import { schema } from "./schema.js";

// Ported from Pixelbin's flux2Pro plugin.
const APP = "fal-ai/flux-2-pro";

// The resolution sets the long side; the aspect ratio sets the short one.
const OUTPUT_RESOLUTION_LONG_SIDE: Record<string, number> = {
  "1K": 1024,
  "2K": 2048,
};

/** The width and height for the aspect ratio. Every schema ratio keeps both sides within fal's 512 to 2048. */
export function flux2ProImageSize(
  aspectRatio: string,
  outputResolution: string,
): { width: number; height: number } {
  const [w, h] = aspectRatio.split(":").map(Number);
  const ratio = w! / h!;
  const longSide =
    OUTPUT_RESOLUTION_LONG_SIDE[outputResolution] ??
    OUTPUT_RESOLUTION_LONG_SIDE["1K"]!;
  return ratio >= 1
    ? { width: longSide, height: Math.round(longSide / ratio) }
    : { width: Math.round(longSide * ratio), height: longSide };
}

export const flux2ProGenerate = defineFalModel({
  plugin: "flux2Pro",
  operation: "generate",
  schema,
  // A reference makes it an edit.
  endpoint: (input) => (imageUrls(input.images).length ? `${APP}/edit` : APP),
  app: APP,
  payload: (input) => {
    const images = imageUrls(input.images);
    return {
      prompt: input.prompt,
      image_size: flux2ProImageSize(
        input.aspect_ratio as string,
        input.output_resolution as string,
      ),
      num_images: 1,
      // On, unlike Pixelbin: the safety checker is never turned off here (see fluxSchnell).
      enable_safety_checker: true,
      // Pixelbin's prompt moderation level (fal's 1 strictest to 6 most permissive).
      safety_tolerance: "5",
      ...(images.length ? { image_urls: images } : {}),
    };
  },
  output: "images",
  // Priced on output_resolution, an option; the default facts include it.
});
