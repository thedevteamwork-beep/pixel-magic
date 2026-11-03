import {
  optionsValidator,
  promptRule,
  uploadRule,
} from "../schemaGenerator.js";
import type { ModelDefinition } from "../types.js";
import { billingInputs, billingRange } from "./billing.js";
import {
  cancelPrediction,
  checkPredictionStatus,
  getPredictionResult,
  parseOutput,
  requestPrediction,
} from "./requests.js";
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
  requestPrediction,
  checkPredictionStatus,
  getPredictionResult,
  cancelPrediction,
  parseOutput,
  timeoutMinutes: 60,
};
