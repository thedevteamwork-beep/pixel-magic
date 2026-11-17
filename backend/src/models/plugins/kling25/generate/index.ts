import { defineFalModel } from "../../../falModel.js";
import { schema } from "./schema.js";

// Ported from Pixelbin's kling25 plugin.
const BASE = "fal-ai/kling-video/v2.5-turbo";

/** Standard renders 720p, Pro 1080p. Standard has no text-to-video, so that is always Pro. */
const tier = (input: Record<string, unknown>) =>
  input.image && input.resolution === "720p" ? "standard" : "pro";

export const kling25Generate = defineFalModel({
  plugin: "kling25",
  operation: "generate",
  schema,
  endpoint: (input) =>
    `${BASE}/${tier(input)}/${input.image ? "image-to-video" : "text-to-video"}`,
  app: "fal-ai/kling-video",
  // An image sets its own shape; text-to-video needs an aspect ratio.
  payload: (input) =>
    input.image
      ? {
          prompt: input.prompt,
          duration: input.duration,
          image_url: input.image,
        }
      : {
          prompt: input.prompt,
          duration: input.duration,
          aspect_ratio: input.aspect_ratio,
        },
  output: "video",
  // As Pixelbin bills it: the tier's resolution and the length in seconds.
  billing: ({ options, uploadCount }) => ({
    ...options,
    image: uploadCount > 0,
    output_resolution:
      uploadCount > 0 && options.resolution === "720p" ? "720p" : "1080p",
    duration: Number(options.duration),
  }),
});
