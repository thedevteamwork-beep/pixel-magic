import { defineFalModel } from "../../../falModel.js";
import { schema } from "./schema.js";

// Ported from Pixelbin's hailuo23 plugin.
const BASE = "fal-ai/minimax/hailuo-2.3/pro";

export const hailuo23Generate = defineFalModel({
  plugin: "hailuo23",
  operation: "generate",
  schema,
  endpoint: (input) =>
    `${BASE}/${input.image ? "image-to-video" : "text-to-video"}`,
  app: "fal-ai/minimax",
  // The Pro tier is fixed at 1080p and 5 seconds, so fal takes only the prompt and image.
  payload: (input) => ({
    prompt: input.prompt,
    ...(input.image ? { image_url: input.image } : {}),
  }),
  output: "video",
  // As Pixelbin bills it: the length in seconds.
  billing: ({ options, uploadCount }) => ({
    ...options,
    image: uploadCount > 0,
    duration: Number(options.duration),
  }),
});
