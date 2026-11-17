import type { ModelSchema } from "../../../types.js";

// Ported from Pixelbin's hailuo23_generate transformation schema.
export const schema: ModelSchema = {
  info: {
    name: "hailuo23_generate",
    displayName: "MiniMax Hailuo 2.3",
    kind: "video",
    category: ["image-to-video", "text-to-video"],
    description:
      "MiniMax Hailuo-2.3 API: Advanced video generation model with 1080p resolution.",
    bannerImage:
      "https://cdn.pixelbin.io/v2/dummy-cloudname/original/prediction_api_banner_images/hailuo23.png",
    logo: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/__pixelbin_assets/logo/hailuo.svg",
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
      enum: ["1080p"],
      default: "1080p",
    },
    duration: {
      type: "string",
      description: "Duration of the generated video",
      enum: ["5"],
      default: "5",
    },
  },
  output: {
    description: "The generated video",
    mimeTypes: ["video/mp4"],
  },
  billing: { units: ["duration"] },
};
