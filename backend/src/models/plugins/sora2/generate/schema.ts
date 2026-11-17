import type { ModelSchema } from "../../../types.js";

// Ported from Pixelbin's sora2_generate transformation schema.
export const schema: ModelSchema = {
  info: {
    name: "sora2_generate",
    displayName: "OpenAI Sora 2",
    kind: "video",
    category: ["image-to-video", "text-to-video"],
    description:
      "Image-to-video endpoint for Sora 2, OpenAI's state-of-the-art video model capable of creating richly detailed, dynamic clips with audio from natural language or images.",
    bannerImage:
      "https://cdn.pixelbin.io/v2/dummy-cloudname/original/prediction_api_banner_images/sora2.png",
    logo: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/__pixelbin_assets/logo/sora-logo.svg",
  },
  input: {
    prompt: {
      type: "string",
      description: "Text description of what you want to generate",
      required: true,
      maxLength: 5000,
    },
    image: {
      type: "image",
      description:
        "Start frame to animate. Leave it out to generate from the prompt alone.",
      required: false,
      maxItems: 1,
      supportedContentTypes: [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
      ],
    },
    resolution: {
      type: "string",
      description: "Resolution of the generated video",
      enum: ["720p"],
      default: "720p",
    },
    aspect_ratio: {
      type: "string",
      description: "Aspect ratio of the generated video",
      enum: ["9:16", "16:9"],
      default: "16:9",
    },
    duration: {
      type: "string",
      description: "Duration of the generated video",
      enum: ["4", "8", "12"],
      default: "4",
    },
  },
  output: {
    description: "The generated video",
    mimeTypes: ["video/mp4"],
  },
  billing: { units: ["duration"] },
};
