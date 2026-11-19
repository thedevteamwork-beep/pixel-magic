import type { ModelSchema } from "../../../types.js";
import { UPSCALE_INPUT_TYPES } from "../../../upscale.js";

// Ported from Pixelbin's ideogram_upscale transformation schema; fields
// follow fal's fal-ai/ideogram/upscale input (Pixelbin's expand_prompt is
// fal's enable_prompt_expansion). The seed keeps fal's default.
export const schema: ModelSchema = {
  info: {
    name: "ideogram_upscale",
    displayName: "Ideogram Upscale",
    kind: "upscale",
    category: ["upscale"],
    description:
      "Upscales images while adding detail you can steer with a prompt, and balance against resemblance to the original.",
    bannerImage:
      "https://cdn.pixelbin.io/v2/dummy-cloudname/t.resize(h:360,w:540)/prediction_api_banner_images/ideogram_upscale.png",
  },
  input: {
    image: {
      type: "image",
      description: "The image to upscale",
      required: true,
      maxItems: 1,
      supportedContentTypes: [...UPSCALE_INPUT_TYPES],
    },
    prompt: {
      type: "string",
      description: "What the added detail should look like (optional)",
      default: "",
      maxLength: 1000,
    },
    detail: {
      type: "integer",
      description: "How much new detail to add",
      minimum: 1,
      maximum: 100,
      default: 50,
    },
    resemblance: {
      type: "integer",
      description: "How closely the result keeps to the original",
      minimum: 1,
      maximum: 100,
      default: 50,
    },
    enable_prompt_expansion: {
      type: "boolean",
      description: "Let Ideogram expand the prompt",
      default: false,
    },
  },
  output: {
    description: "The upscaled image",
    mimeTypes: ["image/png", "image/jpeg", "image/webp"],
  },
  billing: { units: ["images"] },
};
