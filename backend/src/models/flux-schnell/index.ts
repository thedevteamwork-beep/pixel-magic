import {
  optionsValidator,
  promptRule,
  uploadRule,
} from "../schemaGenerator.js";
import type { ModelDefinition } from "../types.js";
import { billingInputs } from "./billing.js";
import {
  cancelPrediction,
  checkPredictionStatus,
  getPredictionResult,
  parseOutput,
  requestPrediction,
} from "./requests.js";
import { schema } from "./schema.js";

export const fluxSchnell: ModelDefinition = {
  key: schema.info.name,
  kind: schema.info.kind,
  displayName: schema.info.displayName,
  schema,
  prompt: promptRule(schema),
  uploads: uploadRule(schema),
  options: optionsValidator(schema),
  billingInputs,
  requestPrediction,
  checkPredictionStatus,
  getPredictionResult,
  cancelPrediction,
  parseOutput,
  timeoutMinutes: 10,
};
