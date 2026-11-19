import type { ImageSize } from "../../../../lib/imageSize.js";
import { defineFalModel } from "../../../falModel.js";
import { outputMegapixels } from "../../../upscale.js";
import { schema } from "./schema.js";

/** The short side each target resolution names. */
const TARGET_SHORT_SIDE: Record<string, number> = {
  "720p": 720,
  "1080p": 1080,
  "1440p": 1440,
  "2160p": 2160,
};

/** How much each side grows: the factor, or what reaches the target resolution. */
function scaleOf(options: Record<string, unknown>, size?: ImageSize): number {
  if (options.upscale_mode !== "target") return Number(options.upscale_factor);
  const shortSide = size ? Math.min(size.width, size.height) : 1000;
  return TARGET_SHORT_SIDE[String(options.target_resolution)]! / shortSide;
}

// Ported from Pixelbin's seedvr upscale plugin.
export const seedvrUpscale = defineFalModel({
  plugin: "seedvr",
  operation: "upscale",
  schema,
  endpoint: "fal-ai/seedvr/upscale/image",
  app: "fal-ai/seedvr",
  payload: (input) => ({
    image_url: input.image,
    upscale_mode: input.upscale_mode,
    upscale_factor: input.upscale_factor,
    target_resolution: input.target_resolution,
    output_format: input.output_format,
  }),
  output: "image",
  // Priced like Pixelbin: by the result's megapixels.
  pricedByImageSize: true,
  billing: ({ options, imageSize }) => ({
    ...(options as Record<string, string | number | boolean>),
    images: 1,
    output_megapixels: outputMegapixels(imageSize, scaleOf(options, imageSize)),
  }),
});
