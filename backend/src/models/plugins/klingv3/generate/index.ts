import { defineFalModel } from "../../../falModel.js";
import { schema } from "./schema.js";

// Ported from Pixelbin's klingv3 plugin.
const BASE = "fal-ai/kling-video/v3";

/** Each resolution is its own fal tier: Standard renders 720p, Pro 1080p, 4K 4K. */
const TIERS: Record<string, string> = {
  "720p": "standard",
  "1080p": "pro",
  "4K": "4k",
};
const tier = (resolution: unknown) => TIERS[String(resolution)] ?? "standard";

export const klingv3Generate = defineFalModel({
  plugin: "klingv3",
  operation: "generate",
  schema,
  endpoint: (input) =>
    `${BASE}/${tier(input.resolution)}/${input.image ? "image-to-video" : "text-to-video"}`,
  app: "fal-ai/kling-video",
  // As Pixelbin sends it; multi_shot is in its schema but never sent to fal.
  // An image sets its own shape; text-to-video needs an aspect ratio.
  payload: (input) => ({
    prompt: input.prompt,
    duration: input.duration,
    shot_type: input.shot_type,
    generate_audio: input.audio,
    ...(input.image
      ? {
          start_image_url: input.image,
          ...(input.end_image ? { end_image_url: input.end_image } : {}),
        }
      : { aspect_ratio: input.aspect_ratio }),
  }),
  output: "video",
  // As Pixelbin bills it: the resolution, audio and the length in seconds.
  billing: ({ options, uploadCount }) => ({
    ...options,
    image: uploadCount > 0,
    output_resolution: String(options.resolution ?? "720p"),
    audio: Boolean(options.audio),
    duration: Number(options.duration),
  }),
});
