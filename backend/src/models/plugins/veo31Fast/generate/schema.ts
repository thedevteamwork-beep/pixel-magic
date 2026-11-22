import type { ModelSchema } from "../../../types.js";
import { endImageField } from "../../../videoInputs.js";

// Ported from Pixelbin's veo31Fast_generate transformation schema.
// end_image switches to fal's first-last-frame-to-video endpoint.
export const schema: ModelSchema = {
  info: {
    name: "veo31Fast_generate",
    displayName: "Google Veo 3.1 Fast",
    kind: "video",
    category: ["image-to-video", "text-to-video"],
    description:
      "Generate videos from a first and last framed using Google's Veo 3.1 Fast.",
    bannerImage:
      "https://cdn.pixelbin.io/v2/dummy-cloudname/original/prediction_api_banner_images/veo31Fast.png",
    logo: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/__pixelbin_assets/logo/google.svg",
  },
  input: {
    prompt: {
      type: "string",
      description: "Text description of what you want to generate",
      required: true,
      maxLength: 5000,
    },
    aspect_ratio: {
      type: "string",
      description: "Aspect ratio of the generated video",
      enum: ["9:16", "16:9"],
      default: "16:9",
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
    audio: {
      type: "boolean",
      description: "Whether to generate audio for the video or not.",
      default: false,
    },
    resolution: {
      type: "string",
      description: "Resolution of the generated video.",
      enum: ["720p", "1080p"],
      default: "720p",
    },
    duration: {
      type: "string",
      description: "Duration of the generated video.",
      enum: ["4", "6", "8"],
      default: "4",
    },
  },
  output: {
    description: "The generated video",
    mimeTypes: ["video/mp4"],
  },
  billing: { units: ["duration"] },
};
