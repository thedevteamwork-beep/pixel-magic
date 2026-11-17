import { defineFalModel, imageUrls } from "../../../falModel.js";
import { schema } from "./schema.js";

// Ported from Pixelbin's grokImagineImage plugin.
const APP = "xai/grok-imagine-image";

export const grokImagineImageGenerate = defineFalModel({
  plugin: "grokImagineImage",
  operation: "generate",
  schema,
  // References make it an edit.
  endpoint: (input) =>
    `${APP}/v2.0/${imageUrls(input.images).length ? "edit" : "text-to-image"}`,
  app: APP,
  payload: (input) => {
    const images = imageUrls(input.images);
    return {
      prompt: input.prompt,
      num_images: 1,
      // "auto" keeps the first reference's shape; with none to keep, Pixelbin sends 1:1.
      aspect_ratio:
        input.aspect_ratio === "auto" && !images.length
          ? "1:1"
          : input.aspect_ratio,
      resolution: input.output_resolution,
      output_format: input.output_format,
      quality: input.quality,
      ...(images.length ? { image_urls: images } : {}),
    };
  },
  output: "images",
  // Priced on output_resolution ("1k" / "2k", as the mapping tests it), an option;
  // the default facts include it.
});
