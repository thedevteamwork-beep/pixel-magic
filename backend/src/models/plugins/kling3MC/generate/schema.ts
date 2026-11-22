import type { ModelSchema } from "../../../types.js";
import { FRAME_TYPES, motionClipField } from "../../../videoInputs.js";

// Ported from Pixelbin's kling3MC transformation schema; fields follow fal's
// fal-ai/kling-video/v3/pro/motion-control input. The video keeps the clip's
// orientation and length (up to 30 s), so it has no duration of its own.
export const schema: ModelSchema = {
  info: {
    name: "kling3MC_generate",
    displayName: "Kling 3.0 Motion Control",
    kind: "video",
    category: ["motion-control"],
    description:
      "Moves your character exactly like the person in a reference clip: dance, gestures, actions.",
    logo: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/__pixelbin_assets/logo/kling.svg",
  },
  input: {
    prompt: {
      type: "string",
      description: "Optional: the setting, outfit or mood",
      maxLength: 2500,
    },
    image: {
      type: "image",
      description:
        "The character to animate: a person with the head and body visible.",
      required: true,
      maxItems: 1,
      supportedContentTypes: [...FRAME_TYPES],
    },
    video: motionClipField(),
    audio: {
      type: "boolean",
      description: "Keep the reference clip's sound",
      default: false,
    },
  },
  output: {
    description: "The generated video",
    mimeTypes: ["video/mp4"],
  },
  billing: { units: ["duration"] },
};
