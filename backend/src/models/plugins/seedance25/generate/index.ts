import { defineFalModel } from "../../../falModel.js";
import { schema } from "./schema.js";

// Ported from Pixelbin's seedance25 plugin (its fal path; Pixelbin tries BytePlus first and falls back to fal).
const APP = "bytedance/seedance-2.5";

export const seedance25Generate = defineFalModel({
  plugin: "seedance25",
  operation: "generate",
  schema,
  // Pixelbin's reference-to-video needs image_urls/video_urls, which are not ported.
  endpoint: (input) =>
    `${APP}/${input.image ? "image-to-video" : "text-to-video"}`,
  app: APP,
  payload: (input) => ({
    prompt: input.prompt,
    resolution: input.resolution,
    // A start frame sets the shape, so fal is told to follow it.
    aspect_ratio: input.image ? "auto" : input.aspect_ratio,
    duration: input.duration,
    generate_audio: input.audio,
    ...(input.image ? { image_url: input.image } : {}),
  }),
  output: "video",
  // As Pixelbin bills it. There is no reference-video input here, so `video` is always false.
  billing: ({ options, uploadCount }) => ({
    ...options,
    image: uploadCount > 0,
    output_resolution: String(options.resolution ?? "720p"),
    video: false,
    duration: Number(options.duration),
  }),
});
