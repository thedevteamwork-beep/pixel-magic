import { z } from "zod";
import { fluxSchnell } from "./flux-schnell/index.js";
import { klingI2v } from "./kling-i2v/index.js";
import type { ModelDefinition, ModelKind } from "./types.js";

const MODELS: ModelDefinition[] = [fluxSchnell, klingI2v];

export function listModels(): ModelDefinition[] {
  return [...MODELS];
}

export function getModel(key: string): ModelDefinition | undefined {
  return MODELS.find((m) => m.key === key);
}

export type PublicModel = {
  key: string;
  name: string;
  kind: ModelKind;
  creditCost: number;
  prompt: ModelDefinition["prompt"];
  uploads: ModelDefinition["uploads"];
  options: unknown;
};

export function publicModel(m: ModelDefinition): PublicModel {
  return {
    key: m.key,
    name: m.displayName,
    kind: m.kind,
    creditCost: m.creditCost(m.options.parse({})),
    prompt: m.prompt,
    uploads: m.uploads,
    options: z.toJSONSchema(m.options),
  };
}
