import { defineFalModel } from "../../../falModel.js";
import { schema } from "./schema.js";

// Ported from Pixelbin's ltx2Fast plugin.
const APP = "fal-ai/ltx-2";

export const ltx2FastGenerate = defineFalModel({
  plugin: "ltx2Fast",
  operation: "generate",
  schema,
  endpoint: (input) =>
    `${APP}/${input.image ? "image-to-video" : "text-to-video"}/fast`,
  app: APP,
  payload: (input) => ({
    prompt: input.prompt,
    duration: Number(input.duration),
    resolution: input.resolution,
    aspect_ratio: input.aspect_ratio,
    generate_audio: input.audio,
    ...(input.image ? { image_url: input.image } : {}),
  }),
  output: "video",
  // As Pixelbin bills it: the resolution and the length in seconds (audio is not priced).
  billing: ({ options, uploadCount }) => ({
    ...options,
    image: uploadCount > 0,
    output_resolution: options.resolution as string,
    duration: Number(options.duration),
  }),
});
