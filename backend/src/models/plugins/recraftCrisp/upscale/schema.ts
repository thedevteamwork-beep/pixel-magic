import type { ModelSchema } from "../../../types.js";
import { UPSCALE_INPUT_TYPES } from "../../../upscale.js";

// Ported from Pixelbin's recraftCrisp_upscale transformation schema; fal's
// fal-ai/recraft/upscale/crisp takes just the image.
export const schema: ModelSchema = {
  info: {
    name: "recraftCrisp_upscale",
    displayName: "Recraft Crisp Upscale",
    kind: "upscale",
    category: ["upscale"],
    description:
      "Sharpens and enlarges images faithfully, keeping them true to the original. Fast and inexpensive.",
    bannerImage:
      "https://cdn.pixelbin.io/v2/dummy-cloudname/t.resize(h:360,w:540)/prediction_api_banner_images/recraftCrisp_upscale.png",
  },
  input: {
    image: {
      type: "image",
      description: "The image to upscale",
      required: true,
      maxItems: 1,
      supportedContentTypes: [...UPSCALE_INPUT_TYPES],
    },
  },
  output: {
    description: "The upscaled image",
    mimeTypes: ["image/png", "image/jpeg", "image/webp"],
  },
  billing: { units: ["images"] },
};
