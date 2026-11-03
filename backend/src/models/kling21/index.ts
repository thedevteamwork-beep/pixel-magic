import {
  optionsValidator,
  promptRule,
  uploadRule,
} from "../schemaGenerator.js";
import type { ModelDefinition } from "../types.js";
import { buildInput, falEndpoint, parseOutput } from "./requests.js";
import { schema } from "./schema.js";

export const kling21: ModelDefinition = {
  key: schema.info.name,
  kind: schema.info.kind,
  displayName: schema.info.displayName,
  schema,
  prompt: promptRule(schema),
  uploads: uploadRule(schema),
  options: optionsValidator(schema),
  // TODO(pricing): placeholder credit cost (Master costs more than Standard).
  // fal price (unverified, see fal model page): about $1.40 for 5s plus $0.28
  // per extra second.
  creditCost: (o) => (o.duration === "10" ? 60 : 30),
  falEndpoint,
  buildInput,
  parseOutput,
  timeoutMinutes: 60,
};
