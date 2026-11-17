import type { ModelSchema } from "../../../types.js";

export const schema: ModelSchema = {
  info: {
    name: "fluxSchnell_generate",
    displayName: "FLUX Schnell",
    kind: "image",
    category: ["text-to-image"],
    description:
      "FLUX.1 [schnell] turns a text prompt into high-quality images in 1 to 4 steps.",
  },
  input: {
    prompt: {
      type: "string",
      description: "Text description of what you want to generate",
      required: true,
      maxLength: 2000,
    },
    image_size: {
      type: "string",
      description: "Size and shape of the generated images",
      enum: [
        "square_hd",
        "square",
        "portrait_4_3",
        "portrait_16_9",
        "landscape_4_3",
        "landscape_16_9",
      ],
      default: "landscape_4_3",
    },
    num_images: {
      type: "integer",
      description: "Number of images to generate",
      minimum: 1,
      maximum: 4,
      default: 1,
    },
  },
  output: { description: "The generated images", mimeTypes: ["image/jpeg"] },
  billing: { units: ["images"] },
};
