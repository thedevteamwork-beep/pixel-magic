import type { FieldSchema, ModelDefinition, ModelKind } from "./types.js";
import { fluxSchnell } from "./flux-schnell/index.js";
import { kling21 } from "./kling21/index.js";
import { publicInput } from "./schemaGenerator.js";

const MODELS: ModelDefinition[] = [fluxSchnell, kling21];

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
  category: readonly string[];
  description: string;
  creditCost: number;
  input: Record<string, FieldSchema>;
};

/** What `GET /v1/models` shows. Never includes the fal endpoint. */
export function publicModel(m: ModelDefinition): PublicModel {
  return {
    key: m.key,
    name: m.displayName,
    kind: m.kind,
    category: m.schema.info.category,
    description: m.schema.info.description,
    creditCost: m.creditCost(m.options.parse({})),
    input: publicInput(m.schema),
  };
}
