import { defineFalModel } from "../../../falModel.js";
import { schema } from "./schema.js";

// Ported from Pixelbin's ideogram upscale plugin.
export const ideogramUpscale = defineFalModel({
  plugin: "ideogram",
  operation: "upscale",
  schema,
  endpoint: "fal-ai/ideogram/upscale",
  app: "fal-ai/ideogram",
  payload: (input) => ({
    image_url: input.image,
    prompt: input.prompt,
    detail: input.detail,
    resemblance: input.resemblance,
    enable_prompt_expansion: input.enable_prompt_expansion,
  }),
  // Ideogram returns a list, holding the one upscaled image.
  output: "images",
  // A flat price per image; the options don't change it.
  billing: () => ({ images: 1 }),
});
