import { optionsValidator } from "../schemaGenerator.js";
import type { ModelDefinition } from "../types.js";
import { schema } from "./schema.js";

type FluxOptions = { image_size: string; num_images: number };

// Facts: the options, `image` (never, this model takes no upload) and
// `images`, the number of images.
export const billingInputs: ModelDefinition["billingInputs"] = (p) => {
  const options = p.options as FluxOptions;
  return { ...options, image: false, images: options.num_images };
};

// The default options with one image and with the most images.
export const billingRange: ModelDefinition["billingRange"] = () => {
  const defaults = optionsValidator(schema).parse({});
  const at = (num_images: number) =>
    billingInputs({ options: { ...defaults, num_images }, uploadCount: 0 });
  return { min: at(1), max: at(4) };
};
