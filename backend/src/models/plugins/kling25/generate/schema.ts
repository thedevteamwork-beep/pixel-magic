import type { ModelSchema } from "../../../types.js";
import { endImageField } from "../../../videoInputs.js";

// Ported from Pixelbin's kling25_generate transformation schema.
// end_image is sent as fal's tail_image_url (image-to-video only).
export const schema: ModelSchema = {
  info: {
    name: "kling25_generate",
    displayName: "Kling 2.5 Turbo",
    kind: "video",
    category: ["image-to-video", "text-to-video"],
    description:
      "Kling 2.5 Turbo generates high-quality text-to-video and image-to-video outputs using FAL Standard and Pro tiers.",
    bannerImage:
      "https://cdn.pixelbin.io/v2/dummy-cloudname/original/prediction_api_banner_images/kling25.png",
    logo: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/__pixelbin_assets/logo/kling.svg",
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
    end_image: endImageField(),
    resolution: {
      type: "string",
      description:
        "Video tier and resolution. Standard generates 720p and Pro generates 1080p. Text-to-video uses Pro.",
      enum: ["720p", "1080p"],
      default: "1080p",
    },
    duration: {
      type: "string",
      description: "Duration of the generated video in seconds",
      enum: ["5", "10"],
      default: "5",
    },
    aspect_ratio: {
      type: "string",
      description: "Aspect ratio of the generated video",
      enum: ["16:9", "9:16", "1:1"],
      default: "16:9",
    },
  },
  output: {
    description: "The generated video",
    mimeTypes: ["video/mp4"],
  },
  billing: { units: ["duration"] },
};
