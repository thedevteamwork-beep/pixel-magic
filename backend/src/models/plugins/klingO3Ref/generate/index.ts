import { defineFalModel, imageUrls } from "../../../falModel.js";
import { schema } from "./schema.js";

// Ported from Pixelbin's klingo3RefToVideo plugin.
const BASE = "fal-ai/kling-video/o3";

/** Each resolution is its own fal tier: Standard renders 720p, Pro 1080p, 4K 2160p. */
const TIERS: Record<string, string> = {
  "720p": "standard",
  "1080p": "pro",
  "2160p": "4k",
};

export const klingO3RefGenerate = defineFalModel({
  plugin: "klingO3Ref",
  operation: "generate",
  schema,
  endpoint: (input) =>
    `${BASE}/${TIERS[String(input.resolution)] ?? "pro"}/reference-to-video`,
  app: "fal-ai/kling-video",
  payload: (input) => ({
    prompt: input.prompt,
    image_urls: imageUrls(input.reference_images),
    duration: input.duration,
    aspect_ratio: input.aspect_ratio,
    generate_audio: input.audio,
    shot_type: "customize",
  }),
  output: "video",
  // As Pixelbin bills it: the resolution, audio, and the length in seconds.
  billing: ({ options, uploadCount }) => ({
    ...options,
    image: uploadCount > 0,
    output_resolution: String(options.resolution),
    audio: Boolean(options.audio),
    duration: Number(options.duration),
  }),
});
