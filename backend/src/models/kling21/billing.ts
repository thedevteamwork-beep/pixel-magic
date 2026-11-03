import { optionsValidator } from "../schemaGenerator.js";
import type { ModelDefinition } from "../types.js";
import { schema } from "./schema.js";

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

// The default options with the duration at its shortest and longest.
export const billingRange: ModelDefinition["billingRange"] = () => {
  const defaults = optionsValidator(schema).parse({});
  const at = (duration: string) =>
    billingInputs({ options: { ...defaults, duration }, uploadCount: 0 });
  return { min: at("5"), max: at("10") };
};
