import type { ModelDefinition } from "../types.js";
import { buildInput, parseOutput } from "./requests.js";
import { optionsSchema, type FluxOptions } from "./schema.js";

// TODO(pricing): placeholder credit cost. fal price (unverified, see fal model
// page): about $0.003 per megapixel.
export const fluxSchnell: ModelDefinition = {
  key: "flux-schnell",
  falModelId: "fal-ai/flux/schnell",
  kind: "image",
  displayName: "FLUX Schnell",
  prompt: { required: true, maxLength: 2000 },
  uploads: { min: 0, max: 0 },
  options: optionsSchema,
  creditCost: (o) => (o as FluxOptions).num_images * 1,
  buildInput,
  parseOutput,
  timeoutMinutes: 10,
};
