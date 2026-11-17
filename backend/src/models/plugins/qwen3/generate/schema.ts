import type { ModelSchema } from "../../../types.js";

// Ported from Pixelbin's qwen3_generate transformation schema.
export const schema: ModelSchema = {
  info: {
    name: "qwen3_generate",
    displayName: "Qwen Image 3",
    kind: "image",
    category: ["text-to-image", "image-to-image"],
    description:
      "Generate images from text or edit images with up to three references using Qwen Image 3.",
    bannerImage:
      "https://cdn.pixelbin.io/v2/dummy-cloudname/original/prediction_api_banner_images/qwen3.png",
    logo: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/__pixelbin_assets/logo/wan.svg",
  },
  input: {
    prompt: {
      type: "string",
      description: "Text prompt for image generation or editing",
      required: true,
      maxLength: 5000,
    },
    images: {
      type: "image",
      description:
        "Reference images to edit or guide the result. Leave them out to generate from the prompt alone.",
      required: false,
      maxItems: 3,
      supportedContentTypes: [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
      ],
    },
    aspect_ratio: {
      type: "string",
      description: "Aspect ratio of the generated or edited image",
      enum: [
        "1:1",
        "16:9",
        "9:16",
        "4:3",
        "3:4",
        "3:2",
        "2:3",
        "21:9",
        "9:21",
        "2:1",
        "1:2",
        "3:1",
        "1:3",
        "5:4",
        "4:5",
      ],
      default: "1:1",
    },
    output_resolution: {
      type: "string",
      description: "Resolution tier of the generated or edited image",
      enum: ["1k", "2k"],
      default: "1k",
    },
  },
  output: {
    description: "The generated images",
    mimeTypes: ["image/png", "image/jpeg", "image/webp"],
  },
  billing: { units: ["images"] },
};
