import {
  optionsValidator,
  promptRule,
  uploadRule,
} from "../schemaGenerator.js";
import type { ModelDefinition } from "../types.js";
import { buildInput, falEndpoint, parseOutput } from "./requests.js";
import { schema } from "./schema.js";

export const fluxSchnell: ModelDefinition = {
  key: schema.info.name,
  kind: schema.info.kind,
  displayName: schema.info.displayName,
  schema,
  prompt: promptRule(schema),
  uploads: uploadRule(schema),
  options: optionsValidator(schema),
  // TODO(pricing): placeholder credit cost. fal price (unverified, see fal
  // model page): about $0.003 per megapixel.
  creditCost: (o) => (o.num_images as number) * 1,
  falEndpoint,
  buildInput,
  parseOutput,
  timeoutMinutes: 10,
};
