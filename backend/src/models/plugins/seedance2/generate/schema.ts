import type { ModelSchema } from "../../../types.js";
import { endImageField } from "../../../videoInputs.js";

// Ported from Pixelbin's seedance2_generate transformation schema.
// end_image is sent as end_image_url. Not ported: image_urls, video_urls, audio_urls (reference-to-video).
export const schema: ModelSchema = {
  info: {
    name: "seedance2_generate",
    displayName: "Seedance 2.0",
    kind: "video",
    category: ["image-to-video", "text-to-video"],
    description:
      "Seedance 2.0, the most advanced video generation model by ByteDance with native audio and cinematic output.",
    bannerImage:
      "https://cdn.pixelbin.io/v2/dummy-cloudname/original/prediction_api_banner_images/seedance2.png",
    logo: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/__pixelbin_assets/logo/seedance.svg",
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
    end_image: endImageField(),
    resolution: {
      type: "string",
      description:
        "Video resolution - 480p for faster generation, 720p or 1080p for higher quality, and 4k for maximum quality.",
      enum: ["480p", "720p", "1080p", "4k"],
      default: "720p",
    },
    aspect_ratio: {
      type: "string",
      description: "Aspect ratio of the generated video",
      enum: ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"],
      default: "16:9",
    },
    duration: {
      type: "string",
      description: "Duration of the generated video in seconds",
      enum: ["4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"],
      default: "5",
    },
    audio: {
      type: "boolean",
      description: "Whether to generate synchronized audio for the video.",
      default: false,
    },
  },
  output: {
    description: "The generated video",
    mimeTypes: ["video/mp4"],
  },
  billing: { units: ["duration"] },
};
