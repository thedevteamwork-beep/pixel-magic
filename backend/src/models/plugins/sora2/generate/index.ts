import { defineFalModel } from "../../../falModel.js";
import { schema } from "./schema.js";

// Ported from Pixelbin's sora2 plugin.
const APP = "fal-ai/sora-2";

export const sora2Generate = defineFalModel({
  plugin: "sora2",
  operation: "generate",
  schema,
  endpoint: (input) =>
    `${APP}/${input.image ? "image-to-video" : "text-to-video"}`,
  app: APP,
  payload: (input) => ({
    prompt: input.prompt,
    resolution: input.resolution,
    aspect_ratio: input.aspect_ratio,
    // Our enum is strings; fal takes the number of seconds.
    duration: Number(input.duration),
    ...(input.image ? { image_url: input.image } : {}),
  }),
  output: "video",
  // As Pixelbin bills it: the length in seconds, at one flat rate.
  billing: ({ options, uploadCount }) => ({
    ...options,
    image: uploadCount > 0,
    duration: Number(options.duration),
  }),
});
