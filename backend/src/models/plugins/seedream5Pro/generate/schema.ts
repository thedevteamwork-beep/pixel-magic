import type { ModelSchema } from "../../../types.js";

// Ported from Pixelbin's seedream5Pro_generate transformation schema.
export const schema: ModelSchema = {
  info: {
    name: "seedream5Pro_generate",
    displayName: "Seedream 5.0 Pro",
    kind: "image",
    category: ["text-to-image", "image-to-image"],
    description: "Generate or edit images using Seedream 5.0 Pro by Bytedance.",
    bannerImage:
      "https://cdn.pixelbin.io/v2/dummy-cloudname/original/prediction_api_banner_images/seedream5Pro.png",
    logo: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/__pixelbin_assets/logo/bytedance.svg",
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
      maxItems: 10,
      supportedContentTypes: [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
      ],
    },
    aspect_ratio: {
      type: "string",
      description: "Aspect ratio of the generated image",
      enum: [
        "auto",
        "1:1",
        "2:3",
        "3:2",
        "3:4",
        "4:3",
        "4:5",
        "5:4",
        "9:16",
        "16:9",
        "21:9",
      ],
      default: "auto",
    },
    output_resolution: {
      type: "string",
      description: "Output image resolution",
      enum: ["1K", "2K"],
      default: "2K",
    },
  },
  output: {
    description: "The generated images",
    mimeTypes: ["image/png", "image/jpeg", "image/webp"],
  },
  billing: { units: ["images"] },
};
