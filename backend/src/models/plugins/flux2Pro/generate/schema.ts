import type { ModelSchema } from "../../../types.js";

// Ported from Pixelbin's flux2Pro_generate transformation schema.
export const schema: ModelSchema = {
  info: {
    name: "flux2Pro_generate",
    displayName: "Flux.2 Pro",
    kind: "image",
    category: ["text-to-image", "image-to-image"],
    description: "Generate or edit images with Flux 2 Pro.",
    bannerImage:
      "https://cdn.pixelbin.io/v2/dummy-cloudname/original/prediction_api_banner_images/flux2Pro.png",
    logo: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/__pixelbin_assets/logo/flux.svg",
  },
  input: {
    prompt: {
      type: "string",
      description: "The prompt to generate an image from.",
      required: true,
      maxLength: 5000,
    },
    images: {
      type: "image",
      description:
        "Reference images to edit or guide the result. Leave them out to generate from the prompt alone.",
      required: false,
      maxItems: 1,
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
      enum: ["1:1", "3:4", "4:3", "9:16", "16:9"],
      default: "4:3",
    },
    output_resolution: {
      type: "string",
      description: "Output image resolution",
      enum: ["1K", "2K"],
      default: "1K",
    },
  },
  output: {
    description: "The generated images",
    mimeTypes: ["image/png", "image/jpeg", "image/webp"],
  },
  billing: { units: ["images"] },
};
