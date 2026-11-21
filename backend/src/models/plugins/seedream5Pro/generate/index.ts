import { defineFalModel, imageUrls } from "../../../falModel.js";
import { schema } from "./schema.js";

// Ported from Pixelbin's seedream5Pro plugin.
// Seedream 5 Pro lives under the bare `bytedance` namespace, not `fal-ai/bytedance`.
const BASE = "bytedance/seedream/v5/pro";

// fal bounds a custom size by total pixels, not by either side: 1K is the floor
// of the accepted range and 2K the ceiling.
const OUTPUT_RESOLUTION_PIXELS: Record<string, number> = {
  "1K": 1024 * 1024,
  "2K": 2048 * 2048,
};

/** fal's own auto size for "auto", else the width and height for the ratio at the resolution's pixel budget. */
export function seedream5ProImageSize(
  aspectRatio: string,
  outputResolution: string,
): string | { width: number; height: number } {
  if (aspectRatio === "auto")
    return outputResolution === "1K" ? "auto_1K" : "auto_2K";
  const [w, h] = aspectRatio.split(":").map(Number);
  const ratio = w! / h!;
  const totalPixels = OUTPUT_RESOLUTION_PIXELS[outputResolution]!;
  // 1K rounds up to stay above fal's floor, 2K rounds down to stay under its ceiling.
  const round = outputResolution === "1K" ? Math.ceil : Math.floor;
  return {
    width: round(Math.sqrt(totalPixels * ratio)),
    height: round(Math.sqrt(totalPixels / ratio)),
  };
}

export const seedream5ProGenerate = defineFalModel({
  plugin: "seedream5Pro",
  operation: "generate",
  schema,
  // References make it an edit.
  endpoint: (input) =>
    `${BASE}/${imageUrls(input.images).length ? "edit" : "text-to-image"}`,
  app: "bytedance/seedream",
  payload: (input) => {
    const images = imageUrls(input.images);
    return {
      prompt: input.prompt,
      image_size: seedream5ProImageSize(
        input.aspect_ratio as string,
        input.output_resolution as string,
      ),
      num_images: input.num_images,
      // As Pixelbin sends it.
      // On, unlike Pixelbin: the safety checker is never turned off here (see fluxSchnell).
      enable_safety_checker: true,
      ...(images.length ? { image_urls: images } : {}),
    };
  },
  output: "images",
  // The mapping prices one image; each extra image costs the same again.
  pricePerImage: { countField: "num_images" },
  // Priced on output_resolution, an option; the default facts include it.
});
