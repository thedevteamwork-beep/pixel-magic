import { defineFalModel } from "../../../falModel.js";
import { schema } from "./schema.js";

// Ported from Pixelbin's wan26 plugin (its reference-to-video path needs video_urls, which is not ported).
const APP = "wan/v2.6";

export const wan26Generate = defineFalModel({
  plugin: "wan26",
  operation: "generate",
  schema,
  endpoint: (input) =>
    `${APP}/${input.image ? "image-to-video" : "text-to-video"}`,
  app: APP,
  // An image sets its own shape; text-to-video takes an aspect ratio. Pixelbin's audio_url is not ported.
  payload: (input) => ({
    prompt: input.prompt,
    duration: input.duration,
    resolution: input.resolution,
    ...(input.image
      ? { image_url: input.image }
      : { aspect_ratio: input.aspect_ratio }),
  }),
  output: "video",
  // As Pixelbin bills it: the resolution and the length in seconds.
  billing: ({ options, uploadCount }) => ({
    ...options,
    image: uploadCount > 0,
    output_resolution: options.resolution as string,
    duration: Number(options.duration),
  }),
});
