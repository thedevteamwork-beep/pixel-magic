import type { ModelSchema } from "../../../types.js";

// Ported from Pixelbin's klingv3_generate transformation schema.
// Not ported (one upload field per model, or no fixed range): multi_prompt, multi_prompt_duration, end_image, image_urls.
export const schema: ModelSchema = {
  info: {
    name: "klingv3_generate",
    displayName: "Kling 3.0",
    kind: "video",
    category: ["image-to-video", "text-to-video"],
    description:
      "Kling 3.0 generates high-quality text-to-video and image-to-video outputs across Standard, Pro, and 4K tiers.",
    bannerImage:
      "https://cdn.pixelbin.io/v2/dummy-cloudname/original/prediction_api_banner_images/kling3.png",
    logo: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/__pixelbin_assets/logo/kling.svg",
  },
  input: {
    prompt: {
      type: "string",
      description: "Text description of what you want to generate",
      required: true,
      maxLength: 5000,
    },
    multi_shot: {
      type: "boolean",
      description: "Whether to use shot-wise prompts for generation.",
      default: true,
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
        "Video tier and resolution. Standard generates 720p, Pro generates 1080p, and 4K generates 4K.",
      enum: ["720p", "1080p", "4K"],
      default: "720p",
    },
    duration: {
      type: "string",
      description: "Duration of the generated video",
      enum: [
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
    shot_type: {
      type: "string",
      description: "The type of multi-shot video generation.",
      enum: ["customize", "intelligent"],
      default: "customize",
    },
    aspect_ratio: {
      type: "string",
      description: "Aspect ratio of the generated video",
      enum: ["16:9", "9:16", "1:1"],
      default: "16:9",
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
