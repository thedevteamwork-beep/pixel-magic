import type { ModelDefinition } from "../../../types.js";

type FluxOptions = { image_size: string; num_images: number };

// Facts: the options, `image` (never, this model takes no upload) and
// `images`, the number of images.
export const billingInputs: ModelDefinition["billingInputs"] = (p) => {
  const options = p.options as FluxOptions;
  return { ...options, image: false, images: options.num_images };
};
