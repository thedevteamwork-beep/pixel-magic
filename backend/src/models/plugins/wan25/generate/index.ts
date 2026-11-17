import { defineFalModel } from "../../../falModel.js";
import { schema } from "./schema.js";

// Ported from Pixelbin's wan25 plugin.
const APP = "fal-ai/wan-25-preview";

export const wan25Generate = defineFalModel({
  plugin: "wan25",
  operation: "generate",
  schema,
  endpoint: (input) =>
    `${APP}/${input.image ? "image-to-video" : "text-to-video"}`,
  app: APP,
  // Pixelbin sends aspect_ratio with or without an image. Its audio_url (background music) is not ported.
  payload: (input) => ({
    prompt: input.prompt,
    duration: input.duration,
    resolution: input.resolution,
    aspect_ratio: input.aspect_ratio,
    ...(input.image ? { image_url: input.image } : {}),
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
