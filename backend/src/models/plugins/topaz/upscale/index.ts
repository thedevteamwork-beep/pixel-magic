import { defineFalModel } from "../../../falModel.js";
import { outputMegapixels } from "../../../upscale.js";
import { schema } from "./schema.js";

// Ported from Pixelbin's topaz upscale plugin.
export const topazUpscale = defineFalModel({
  plugin: "topaz",
  operation: "upscale",
  schema,
  endpoint: "fal-ai/topaz/upscale/image",
  app: "fal-ai/topaz",
  payload: (input) => ({
    image_url: input.image,
    model: input.model,
    upscale_factor: input.upscale_factor,
    face_enhancement: input.face_enhancement,
    subject_detection: input.subject_detection,
    crop_to_fill: input.crop_to_fill,
    output_format: input.output_format,
  }),
  output: "image",
  // Priced like Pixelbin: by the result's megapixels.
  pricedByImageSize: true,
  billing: ({ options, imageSize }) => ({
    ...(options as Record<string, string | number | boolean>),
    images: 1,
    output_megapixels: outputMegapixels(
      imageSize,
      Number(options.upscale_factor),
    ),
  }),
});
