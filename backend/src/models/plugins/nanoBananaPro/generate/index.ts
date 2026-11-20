import { defineFalModel, imageUrls } from "../../../falModel.js";
import { schema } from "./schema.js";

// Ported from Pixelbin's nanoBananaPro plugin (its fal path; Pixelbin tries Vertex AI first).
const APP = "fal-ai/nano-banana-pro";

export const nanoBananaProGenerate = defineFalModel({
  plugin: "nanoBananaPro",
  operation: "generate",
  schema,
  // References make it an edit.
  endpoint: (input) => (imageUrls(input.images).length ? `${APP}/edit` : APP),
  app: APP,
  payload: (input) => {
    const images = imageUrls(input.images);
    return {
      prompt: input.prompt,
      num_images: input.num_images,
      resolution: input.output_resolution,
      // fal takes no "auto"; Pixelbin sends 1:1 in its place.
      aspect_ratio: input.aspect_ratio === "auto" ? "1:1" : input.aspect_ratio,
      ...(images.length ? { image_urls: images } : {}),
    };
  },
  output: "images",
  // The mapping prices one image; each extra image costs the same again.
  pricePerImage: { countField: "num_images" },
  // Priced on output_resolution, an option; the default facts include it.
});
