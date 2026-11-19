import type { ModelSchema } from "../../../types.js";
import { UPSCALE_INPUT_TYPES } from "../../../upscale.js";

// Ported from Pixelbin's recraftCreative_upscale transformation schema; fal's
// fal-ai/recraft/upscale/creative takes just the image.
export const schema: ModelSchema = {
  info: {
    name: "recraftCreative_upscale",
    displayName: "Recraft Creative Upscale",
    kind: "upscale",
    category: ["upscale"],
    description:
      "Enlarges images and adds new, finer detail and texture, for a richer result than the original.",
    bannerImage:
      "https://cdn.pixelbin.io/v2/dummy-cloudname/t.resize(h:360,w:540)/prediction_api_banner_images/recraftCreative_upscale.png",
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
