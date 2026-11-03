import { z } from "zod";
import type { ModelSchema } from "../types.js";

export const schema: ModelSchema = {
  info: {
    name: "kling21",
    displayName: "Kling 2.1 Master",
    kind: "video",
    category: ["image-to-video", "text-to-video"],
    description:
      "The premium endpoint for Kling 2.1, designed for top-tier image-to-video generation with unparalleled motion fluidity, cinematic visuals, and exceptional prompt precision.",
  },
  input: {
    prompt: {
      type: "string",
      description: "Text description of what you want to generate",
      required: true,
      maxLength: 2500,
    },
    image: {
      type: "image",
      description:
        "Image to animate. Leave it out to generate from the prompt alone.",
      required: false,
      maxItems: 1,
      supportedContentTypes: [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif",
        "image/bmp",
      ],
    },
    duration: {
      type: "string",
      description: "Duration of the generated video in seconds",
      enum: ["5", "10"],
      default: "5",
    },
    aspect_ratio: {
      type: "string",
      description:
        "Aspect ratio of the generated video (text-to-video only; an image sets its own)",
      enum: ["9:16", "16:9", "1:1"],
      default: "16:9",
    },
  },
  output: { description: "The generated video", mimeTypes: ["video/mp4"] },
  billing: { units: ["duration"] },
};

// What fal returns. Extra fields are tolerated and ignored.
export const falResponse = z.object({
  video: z.object({
    url: z.string().url(),
    content_type: z.string().optional(),
    file_name: z.string().optional(),
    file_size: z.number().optional(),
  }),
});
