import type { ModelSchema } from "../../../types.js";

// Ported from Pixelbin's pixverse6_generate transformation schema.
export const schema: ModelSchema = {
  info: {
    name: "pixverse6_generate",
    displayName: "PixVerse 6",
    kind: "video",
    category: ["image-to-video", "text-to-video"],
    description:
      "PixVerse 6: Cinematic AI video generation with native audio, style presets, camera controls, and 1-15 second duration.",
    bannerImage:
      "https://cdn.pixelbin.io/v2/dummy-cloudname/original/prediction_api_banner_images/pixverse6.png",
    logo: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/__pixelbin_assets/logo/pixverse6.svg",
  },
  input: {
    prompt: {
      type: "string",
      description: "The text prompt to guide video generation.",
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
      description:
        "Video resolution - from 360p for fastest generation to 1080p for highest quality.",
      enum: ["360p", "540p", "720p", "1080p"],
      default: "720p",
    },
    aspect_ratio: {
      type: "string",
      description: "Aspect ratio of the generated video",
      enum: ["16:9", "4:3", "1:1", "3:4", "9:16", "2:3", "3:2", "21:9"],
      default: "16:9",
    },
    duration: {
      type: "string",
      description: "Duration of the generated video in seconds",
      enum: [
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "11",
        "12",
        "13",
        "14",
        "15",
      ],
      default: "5",
    },
    style: {
      type: "string",
      description: "Visual style preset for the generated video.",
      enum: ["anime", "3d_animation", "clay", "comic", "cyberpunk"],
    },
    audio: {
      type: "boolean",
      description: "Whether to generate audio for the video.",
      default: false,
    },
  },
  output: {
    description: "The generated video",
    mimeTypes: ["video/mp4"],
  },
  billing: { units: ["duration"] },
};
