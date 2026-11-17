import { defineFalModel } from "../../../falModel.js";
import { schema } from "./schema.js";

const BASE = "fal-ai/kling-video/v2.1/master";

export const kling21Generate = defineFalModel({
  plugin: "kling21",
  operation: "generate",
  schema,
  endpoint: (input) =>
    `${BASE}/${input.image ? "image-to-video" : "text-to-video"}`,
  app: "fal-ai/kling-video",
  // An image makes it image-to-video and sets its own shape; text-to-video needs an aspect ratio.
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
  // Facts: the options, `image`, and `duration` as a number of seconds.
  billing: ({ options, uploadCount }) => ({
    ...(options as { duration: string; aspect_ratio: string }),
    image: uploadCount > 0,
    duration: Number(options.duration),
  }),
  timeoutMinutes: 60,
});
