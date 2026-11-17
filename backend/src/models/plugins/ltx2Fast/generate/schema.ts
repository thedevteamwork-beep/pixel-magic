import type { ModelSchema } from "../../../types.js";

// Ported from Pixelbin's ltx2Fast_generate transformation schema.
export const schema: ModelSchema = {
  info: {
    name: "ltx2Fast_generate",
    displayName: "LTX-2 Fast",
    kind: "video",
    category: ["image-to-video", "text-to-video"],
    description:
      "Create high-fidelity video with audio from images with LTX-2 Fast - optimized for faster generation times.",
    bannerImage:
      "https://cdn.pixelbin.io/v2/dummy-cloudname/original/prediction_api_banner_images/ltx2Fast.png",
    logo: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/__pixelbin_assets/logo/ltx.svg",
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
    duration: {
      type: "string",
      description: "Duration of the generated video",
      enum: ["6", "8", "10", "12", "14", "16", "18", "20"],
      default: "6",
    },
    resolution: {
      type: "string",
      description: "Resolution of the generated video",
      enum: ["1080p", "1440p", "2160p"],
      default: "1080p",
    },
    aspect_ratio: {
      type: "string",
      description: "Aspect ratio of the generated video",
      enum: ["16:9"],
      default: "16:9",
    },
    audio: {
      type: "boolean",
      description: "Generate audio for the generated video",
      default: true,
    },
  },
  output: {
    description: "The generated video",
    mimeTypes: ["video/mp4"],
  },
  billing: { units: ["duration"] },
};
