import type { ModelSchema } from "../../../types.js";

// Ported from Pixelbin's gpt2_generate transformation schema.
export const schema: ModelSchema = {
  info: {
    name: "gpt2_generate",
    displayName: "GPT Image 2",
    kind: "image",
    category: ["text-to-image", "image-to-image"],
    description:
      "Generation of extremely complex images, text-heavy image generation.",
    bannerImage:
      "https://cdn.pixelbin.io/v2/dummy-cloudname/original/prediction_api_banner_images/gpt2.png",
    logo: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/__pixelbin_assets/logo/sora-logo.svg",
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
      maxItems: 16,
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
      default: "1:1",
    },
    output_resolution: {
      type: "string",
      description: "Output image resolution",
      enum: ["1K", "2K", "4K"],
      default: "1K",
    },
    quality: {
      type: "string",
      description: "Quality for the generated image",
      enum: ["low", "medium", "high"],
      default: "high",
    },
    num_images: {
      type: "integer",
      description: "How many images to generate",
      minimum: 1,
      maximum: 4,
      default: 1,
    },
  },
  output: {
    description: "The generated images",
    mimeTypes: ["image/png", "image/jpeg", "image/webp"],
  },
  billing: { units: ["images"] },
};
