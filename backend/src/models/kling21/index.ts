import {
  optionsValidator,
  promptRule,
  uploadRule,
} from "../schemaGenerator.js";
import type { ModelDefinition } from "../types.js";
import { billingInputs, billingRange } from "./billing.js";
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
  billingInputs,
  billingRange,
  falEndpoint,
  buildInput,
  parseOutput,
  timeoutMinutes: 60,
};
