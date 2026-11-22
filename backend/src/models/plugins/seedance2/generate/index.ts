import { defineFalModel } from "../../../falModel.js";
import { schema } from "./schema.js";

// Ported from Pixelbin's seedance2 plugin (its fal path; Pixelbin tries BytePlus first and falls back to fal).
const APP = "bytedance/seedance-2.0";

export const seedance2Generate = defineFalModel({
  plugin: "seedance2",
  operation: "generate",
  schema,
  endpoint: (input) =>
    `${APP}/${input.image ? "image-to-video" : "text-to-video"}`,
  app: APP,
  payload: (input) => ({
    prompt: input.prompt,
    resolution: input.resolution,
    aspect_ratio: input.aspect_ratio,
    duration: input.duration,
    generate_audio: input.audio,
    ...(input.image ? { image_url: input.image } : {}),
    ...(input.image && input.end_image
      ? { end_image_url: input.end_image }
      : {}),
  }),
  output: "video",
  // As Pixelbin bills it. There is no reference-video input here, so `video` is always false.
  billing: ({ options, uploadCount }) => ({
    ...options,
    image: uploadCount > 0,
    output_resolution: String(options.resolution),
    video: false,
    duration: Number(options.duration),
  }),
});
