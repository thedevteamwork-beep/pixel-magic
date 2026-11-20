import type { ModelSchema } from "../../../types.js";

// Ported from Pixelbin's nanoBananaPro_generate transformation schema.
export const schema: ModelSchema = {
  info: {
    name: "nanoBananaPro_generate",
    displayName: "Nano Banana Pro",
    kind: "image",
    category: ["text-to-image", "image-to-image"],
    description:
      "Google's new state-of-the-art image generation and editing model. Generate images from text prompts or edit existing images.",
    bannerImage:
      "https://cdn.pixelbin.io/v2/dummy-cloudname/t.resize(h:360,w:540)/prediction_api_banner_images/nanobananapro.png",
    logo: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/__pixelbin_assets/logo/google.svg",
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
      maxItems: 14,
      supportedContentTypes: [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
      ],
    },
    aspect_ratio: {
      type: "string",
      description: "The aspect ratio of the generated image",
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
      enum: ["1K", "2K", "4K"],
      default: "1K",
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
