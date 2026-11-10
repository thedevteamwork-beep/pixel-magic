import {
  inputValidator,
  optionsValidator,
  uploadRule,
} from "../../../schemaGenerator.js";
import type { ModelDefinition } from "../../../types.js";
import { billingInputs } from "./billing.js";
import {
  cancelPrediction,
  checkPredictionStatus,
  getPredictionResult,
  parseOutput,
  requestPrediction,
} from "./requests.js";
import { schema } from "./schema.js";

export const kling21Generate: ModelDefinition = {
  plugin: "kling21",
  operation: "generate",
  key: schema.info.name,
  kind: schema.info.kind,
  displayName: schema.info.displayName,
  schema,
  input: inputValidator(schema),
  uploads: uploadRule(schema),
  options: optionsValidator(schema),
  billingInputs,
  requestPrediction,
  checkPredictionStatus,
  getPredictionResult,
  cancelPrediction,
  parseOutput,
  timeoutMinutes: 60,
};
