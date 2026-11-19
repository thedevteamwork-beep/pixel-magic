import type { ModelSchema } from "../../../types.js";
import { UPSCALE_INPUT_TYPES } from "../../../upscale.js";

// Ported from Pixelbin's topaz_upscale transformation schema; fields and
// values follow fal's fal-ai/topaz/upscale/image input. fal's fine-tuning
// numbers (face enhancement creativity/strength, denoise, sharpen…) keep
// fal's defaults.
export const schema: ModelSchema = {
  info: {
    name: "topaz_upscale",
    displayName: "Topaz Upscale",
    kind: "upscale",
    category: ["upscale"],
    description:
      "Enhance and upscale images with Topaz Labs' models: faithful detail for photos, text and graphics, or generative restoration.",
    bannerImage:
      "https://cdn.pixelbin.io/v2/dummy-cloudname/t.resize(h:360,w:540)/prediction_api_banner_images/topaz_upscale.png",
  },
  input: {
    image: {
      type: "image",
      description: "The image to upscale",
      required: true,
      maxItems: 1,
      supportedContentTypes: [...UPSCALE_INPUT_TYPES],
    },
    model: {
      type: "string",
      description: "The Topaz model to enhance the image with",
      enum: [
        "Standard V2",
        "High Fidelity V2",
        "Low Resolution V2",
        "CGI",
        "Text Refine",
        "Recovery",
        "Recovery V2",
        "Redefine",
        "Standard MAX",
        "Wonder",
        "Wonder 3",
      ],
      default: "Standard V2",
    },
    upscale_factor: {
      type: "integer",
      description: "How many times larger to make each side",
      minimum: 1,
      maximum: 4,
      default: 2,
    },
    face_enhancement: {
      type: "boolean",
      description: "Recover detail in faces",
      default: true,
    },
    subject_detection: {
      type: "string",
      description: "Which part of the image to enhance",
      enum: ["All", "Foreground", "Background"],
      default: "All",
    },
    crop_to_fill: {
      type: "boolean",
      description: "Crop to fill the output size instead of fitting inside it",
      default: false,
    },
    output_format: {
      type: "string",
      description: "The file format of the result",
      enum: ["png", "jpeg"],
      default: "png",
    },
  },
  output: {
    description: "The upscaled image",
    mimeTypes: ["image/png", "image/jpeg"],
  },
  billing: { units: ["images"] },
};
