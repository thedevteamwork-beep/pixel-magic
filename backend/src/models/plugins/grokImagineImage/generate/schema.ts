import type { ModelSchema } from "../../../types.js";

// Ported from Pixelbin's grokImagineImage_generate transformation schema.
export const schema: ModelSchema = {
  info: {
    name: "grokImagineImage_generate",
    displayName: "Grok Imagine Image 2.0",
    kind: "image",
    category: ["text-to-image", "image-to-image"],
    description: "Generate or edit images with Grok Imagine Image 2.0.",
    bannerImage:
      "https://cdn.pixelbin.io/v2/dummy-cloudname/original/prediction_api_banner_images/grokImagineImage.png",
    logo: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/__pixelbin_assets/logo/grok-icon.svg",
  },
  input: {
    prompt: {
      type: "string",
      description: "Text description of the image to generate or edit",
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
      description:
        "Aspect ratio of the output; auto preserves the first input image during editing",
      enum: [
        "auto",
        "2:1",
        "20:9",
        "19.5:9",
        "16:9",
        "4:3",
        "3:2",
        "1:1",
        "2:3",
        "3:4",
        "9:16",
        "9:19.5",
        "9:20",
        "1:2",
      ],
      default: "auto",
    },
    output_resolution: {
      type: "string",
      description: "Resolution of the generated or edited image",
      enum: ["1k", "2k"],
      default: "1k",
    },
    output_format: {
      type: "string",
      description: "Format of the generated or edited image",
      enum: ["png", "webp"],
      default: "png",
    },
    quality: {
      type: "string",
      description: "Quality level of the generated or edited image",
      enum: ["low", "medium"],
      default: "medium",
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
