import type { ModelSchema } from "../../../types.js";

// Ported from Pixelbin's krea2_generate transformation schema.
export const schema: ModelSchema = {
  info: {
    name: "krea2_generate",
    displayName: "Krea V2",
    kind: "image",
    category: ["text-to-image", "image-to-image"],
    description:
      "Generate high-quality images with Krea V2 Medium or Large, optionally guided by style reference images.",
    bannerImage:
      "https://cdn.pixelbin.io/v2/dummy-cloudname/original/prediction_api_banner_images/krea2.png",
    logo: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/__pixelbin_assets/logo/krea.svg",
  },
  input: {
    prompt: {
      type: "string",
      description: "Text description of the image to generate",
      required: true,
      maxLength: 5000,
    },
    model: {
      type: "string",
      description: "Krea V2 model to use for image generation",
      enum: ["medium", "large"],
      default: "medium",
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
      enum: ["1:1", "4:3", "3:2", "16:9", "2.35:1", "4:5", "2:3", "9:16"],
      default: "1:1",
    },
    creativity: {
      type: "string",
      description: "Controls how loosely the model interprets the prompt",
      enum: ["raw", "low", "medium", "high"],
      default: "medium",
    },
  },
  output: {
    description: "The generated images",
    mimeTypes: ["image/png", "image/jpeg", "image/webp"],
  },
  billing: { units: ["images"] },
};
