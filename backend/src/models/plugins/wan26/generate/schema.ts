import type { ModelSchema } from "../../../types.js";

// Ported from Pixelbin's wan26_generate transformation schema.
// Not ported (one upload field per model, or no fixed range), so reference-to-video is not offered: video_urls, audio_url.
export const schema: ModelSchema = {
  info: {
    name: "wan26_generate",
    displayName: "Wan 2.6",
    kind: "video",
    category: ["image-to-video", "text-to-video"],
    description:
      "Wan 2.6 generates videos from text, a starting image, or up to three reference videos with native audio and character consistency.",
    bannerImage:
      "https://cdn.pixelbin.io/v2/dummy-cloudname/original/prediction_api_banner_images/wan26.png",
    logo: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/__pixelbin_assets/logo/wan.svg",
  },
  input: {
    prompt: {
      type: "string",
      description:
        "The text prompt describing the desired video. Max 1500 characters.",
      required: true,
      maxLength: 1500,
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
      description: "Duration of the generated video in seconds.",
      enum: ["5", "10", "15"],
      default: "5",
    },
    resolution: {
      type: "string",
      description: "Resolution of the generated video.",
      enum: ["720p", "1080p"],
      default: "1080p",
    },
    aspect_ratio: {
      type: "string",
      description: "Aspect ratio of the generated video.",
      enum: ["16:9", "9:16", "1:1", "4:3", "3:4"],
      default: "16:9",
    },
  },
  output: {
    description: "The generated video",
    mimeTypes: ["video/mp4"],
  },
  billing: { units: ["duration"] },
};
