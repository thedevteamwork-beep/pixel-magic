import type { ModelSchema } from "../../../types.js";
import { UPSCALE_INPUT_TYPES } from "../../../upscale.js";

// Ported from Pixelbin's seedvr_upscale transformation schema; fields and
// values follow fal's fal-ai/seedvr/upscale/image input. Its noise scale and
// seed keep fal's defaults.
export const schema: ModelSchema = {
  info: {
    name: "seedvr_upscale",
    displayName: "SeedVR2 Upscale",
    kind: "upscale",
    category: ["upscale"],
    description:
      "ByteDance's SeedVR2 restores and upscales images by a factor or to a target resolution, with crisp, natural detail.",
    bannerImage:
      "https://cdn.pixelbin.io/v2/dummy-cloudname/t.resize(h:360,w:540)/prediction_api_banner_images/seedvr_upscale.png",
  },
  input: {
    image: {
      type: "image",
      description: "The image to upscale",
      required: true,
      maxItems: 1,
      supportedContentTypes: [...UPSCALE_INPUT_TYPES],
    },
    upscale_mode: {
      type: "string",
      description:
        "factor: scale each side by upscale_factor. target: scale to target_resolution.",
      enum: ["factor", "target"],
      default: "factor",
    },
    upscale_factor: {
      type: "integer",
      description: "How many times larger to make each side (factor mode)",
      minimum: 1,
      maximum: 10,
      default: 2,
    },
    target_resolution: {
      type: "string",
      description: "The resolution to reach (target mode)",
      enum: ["720p", "1080p", "1440p", "2160p"],
      default: "1080p",
    },
    output_format: {
      type: "string",
      description: "The file format of the result",
      enum: ["png", "jpg", "webp"],
      default: "png",
    },
  },
  output: {
    description: "The upscaled image",
    mimeTypes: ["image/png", "image/jpeg", "image/webp"],
  },
  billing: { units: ["images"] },
};
