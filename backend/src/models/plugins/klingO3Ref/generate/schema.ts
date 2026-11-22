import type { ModelSchema } from "../../../types.js";
import { referenceImagesField } from "../../../videoInputs.js";

// Ported from Pixelbin's klingo3RefToVideo transformation schema; fields follow
// fal's fal-ai/kling-video/o3/{tier}/reference-to-video input. Not ported: a
// start/end frame, elements and multi-prompt shots (Reference to Video keeps it to references).
export const schema: ModelSchema = {
  info: {
    name: "klingO3Ref_generate",
    displayName: "Kling O3 Reference",
    kind: "video",
    category: ["reference-to-video"],
    description:
      "Keeps people, products and styles from up to four reference images consistent across a new scene.",
    logo: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/__pixelbin_assets/logo/kling.svg",
  },
  input: {
    prompt: {
      type: "string",
      description:
        "The scene to make, referring to the images as @Image1, @Image2…",
      required: true,
      maxLength: 2500,
    },
    reference_images: referenceImagesField(4, true),
    resolution: {
      type: "string",
      description: "Output resolution",
      enum: ["720p", "1080p", "2160p"],
      default: "1080p",
    },
    duration: {
      type: "string",
      description: "Length of the video in seconds",
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
    aspect_ratio: {
      type: "string",
      description: "Shape of the video",
      enum: ["16:9", "9:16", "1:1"],
      default: "16:9",
    },
    audio: {
      type: "boolean",
      description: "Generate synced sound",
      default: false,
    },
  },
  output: {
    description: "The generated video",
    mimeTypes: ["video/mp4"],
  },
  billing: { units: ["duration"] },
};
