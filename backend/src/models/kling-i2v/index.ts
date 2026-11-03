import type { ModelDefinition } from "../types.js";
import { buildInput, parseOutput } from "./requests.js";
import { optionsSchema, type KlingOptions } from "./schema.js";

// TODO(pricing): placeholder credit cost. fal price (unverified, see fal model
// page): about $0.25 for 5s plus $0.05 per extra second.
export const klingI2v: ModelDefinition = {
  key: "kling-i2v",
  falModelId: "fal-ai/kling-video/v2.1/standard/image-to-video",
  kind: "video",
  displayName: "Kling 2.1 Standard (image to video)",
  prompt: { required: true, maxLength: 2500 },
  uploads: { min: 1, max: 1 },
  options: optionsSchema,
  creditCost: (o) => ((o as KlingOptions).duration === "10" ? 20 : 10),
  buildInput,
  parseOutput,
  timeoutMinutes: 60,
};
