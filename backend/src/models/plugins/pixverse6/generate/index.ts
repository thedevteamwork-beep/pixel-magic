import { defineFalModel } from "../../../falModel.js";
import { schema } from "./schema.js";

// Ported from Pixelbin's pixverse6 plugin.
const BASE = "fal-ai/pixverse/v6";

export const pixverse6Generate = defineFalModel({
  plugin: "pixverse6",
  operation: "generate",
  schema,
  endpoint: (input) =>
    `${BASE}/${input.image ? "image-to-video" : "text-to-video"}`,
  app: "fal-ai/pixverse",
  // An image sets its own shape; text-to-video takes an aspect ratio. Style has no default, so it is sent only when set.
  payload: (input) => ({
    prompt: input.prompt,
    resolution: input.resolution,
    duration: Number(input.duration),
    generate_audio_switch: input.audio ?? false,
    ...(input.style ? { style: input.style } : {}),
    ...(input.image
      ? { image_url: input.image }
      : { aspect_ratio: input.aspect_ratio }),
  }),
  output: "video",
  // As Pixelbin bills it: the resolution, whether there is audio, and the length in seconds.
  billing: ({ options, uploadCount }) => ({
    ...options,
    image: uploadCount > 0,
    output_resolution: options.resolution as string,
    audio: options.audio === true,
    duration: Number(options.duration),
  }),
});
