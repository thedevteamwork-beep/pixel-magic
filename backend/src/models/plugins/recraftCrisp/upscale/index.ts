import { defineFalModel } from "../../../falModel.js";
import { schema } from "./schema.js";

// Ported from Pixelbin's recraftCrisp upscale plugin, safety checker off as there.
export const recraftCrispUpscale = defineFalModel({
  plugin: "recraftCrisp",
  operation: "upscale",
  schema,
  endpoint: "fal-ai/recraft/upscale/crisp",
  app: "fal-ai/recraft",
  payload: (input) => ({
    image_url: input.image,
    enable_safety_checker: false,
  }),
  output: "image",
  billing: () => ({ images: 1 }),
});
