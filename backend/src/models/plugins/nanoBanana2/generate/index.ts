import { defineFalModel, imageUrls } from "../../../falModel.js";
import { schema } from "./schema.js";

// Ported from Pixelbin's nanoBanana2 plugin (its fal fallback; Pixelbin tries Vertex AI first).
const APP = "fal-ai/nano-banana-2";

export const nanoBanana2Generate = defineFalModel({
  plugin: "nanoBanana2",
  operation: "generate",
  schema,
  // References make it an edit.
  endpoint: (input) => (imageUrls(input.images).length ? `${APP}/edit` : APP),
  app: APP,
  payload: (input) => {
    const images = imageUrls(input.images);
    return {
      prompt: input.prompt,
      resolution: input.output_resolution,
      aspect_ratio: input.aspect_ratio,
      ...(images.length ? { image_urls: images } : {}),
    };
  },
  output: "images",
  // Priced on output_resolution, an option; the default facts include it.
});
