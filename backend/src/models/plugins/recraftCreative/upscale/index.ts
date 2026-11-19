import { defineFalModel } from "../../../falModel.js";
import { schema } from "./schema.js";

// Ported from Pixelbin's recraftCreative upscale plugin, safety checker off as there.
export const recraftCreativeUpscale = defineFalModel({
  plugin: "recraftCreative",
  operation: "upscale",
  schema,
  endpoint: "fal-ai/recraft/upscale/creative",
  app: "fal-ai/recraft",
  payload: (input) => ({
    image_url: input.image,
    enable_safety_checker: false,
  }),
  output: "image",
  billing: () => ({ images: 1 }),
});
