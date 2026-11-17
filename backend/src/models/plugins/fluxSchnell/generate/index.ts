import { defineFalModel } from "../../../falModel.js";
import { schema } from "./schema.js";

export const fluxSchnellGenerate = defineFalModel({
  plugin: "fluxSchnell",
  operation: "generate",
  schema,
  endpoint: "fal-ai/flux/schnell",
  payload: (input) => ({
    prompt: input.prompt,
    image_size: input.image_size,
    num_images: input.num_images,
    // Always on: the safety checker is never user-controllable.
    enable_safety_checker: true,
  }),
  output: "images",
  // Facts: the options, `image` (never: this model takes no upload) and `images`.
  billing: ({ options }) => ({
    ...(options as { image_size: string; num_images: number }),
    image: false,
    images: options.num_images as number,
  }),
  timeoutMinutes: 10,
});
