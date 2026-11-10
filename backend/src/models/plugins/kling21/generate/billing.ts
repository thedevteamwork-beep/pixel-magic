import type { ModelDefinition } from "../../../types.js";

type Kling21Options = { duration: string; aspect_ratio: string };

// Facts: the options, `image`, and `duration` as a number of seconds.
export const billingInputs: ModelDefinition["billingInputs"] = (p) => {
  const options = p.options as Kling21Options;
  return {
    ...options,
    image: p.uploadCount > 0,
    duration: Number(options.duration),
  };
};
