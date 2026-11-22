import type { FieldSchema, ModelDefinition, ModelKind } from "./types.js";
import { validateModelSchema } from "./metaSchema.js";
import { publicInput } from "./schemaGenerator.js";
import { flux2Pro } from "./plugins/flux2Pro/index.js";
import { fluxSchnell } from "./plugins/fluxSchnell/index.js";
import { gpt2 } from "./plugins/gpt2/index.js";
import { grokImagineImage } from "./plugins/grokImagineImage/index.js";
import { hailuo23 } from "./plugins/hailuo23/index.js";
import { ideogram } from "./plugins/ideogram/index.js";
import { kling21 } from "./plugins/kling21/index.js";
import { kling3MC } from "./plugins/kling3MC/index.js";
import { kling25 } from "./plugins/kling25/index.js";
import { klingO3Ref } from "./plugins/klingO3Ref/index.js";
import { klingv3 } from "./plugins/klingv3/index.js";
import { krea2 } from "./plugins/krea2/index.js";
import { ltx2Fast } from "./plugins/ltx2Fast/index.js";
import { nanoBanana2 } from "./plugins/nanoBanana2/index.js";
import { nanoBananaPro } from "./plugins/nanoBananaPro/index.js";
import { pixverse6 } from "./plugins/pixverse6/index.js";
import { qwen3 } from "./plugins/qwen3/index.js";
import { recraftCreative } from "./plugins/recraftCreative/index.js";
import { recraftCrisp } from "./plugins/recraftCrisp/index.js";
import { seedance2 } from "./plugins/seedance2/index.js";
import { seedance25 } from "./plugins/seedance25/index.js";
import { seedream5Pro } from "./plugins/seedream5Pro/index.js";
import { seedvr } from "./plugins/seedvr/index.js";
import { sora2 } from "./plugins/sora2/index.js";
import { topaz } from "./plugins/topaz/index.js";
import { veo31Fast } from "./plugins/veo31Fast/index.js";
import { wan25 } from "./plugins/wan25/index.js";
import { wan26 } from "./plugins/wan26/index.js";

/** Every plugin and its operations, like jiraiya's `predictionBackends`. */
const PLUGINS: Record<string, Record<string, ModelDefinition>> = {
  // Image
  fluxSchnell,
  flux2Pro,
  nanoBananaPro,
  nanoBanana2,
  gpt2,
  seedream5Pro,
  qwen3,
  grokImagineImage,
  krea2,
  // Video
  kling21,
  kling25,
  klingv3,
  seedance2,
  seedance25,
  veo31Fast,
  hailuo23,
  wan25,
  wan26,
  sora2,
  ltx2Fast,
  pixverse6,
  klingO3Ref,
  kling3MC,
  // Upscale
  topaz,
  seedvr,
  recraftCrisp,
  recraftCreative,
  ideogram,
};

const MODELS: ModelDefinition[] = Object.values(PLUGINS).flatMap((operations) =>
  Object.values(operations),
);

// A mistake in a model stops the app here, naming the model.
for (const [plugin, operations] of Object.entries(PLUGINS)) {
  for (const [operation, m] of Object.entries(operations)) {
    // 1. the schema is well formed
    validateModelSchema(m.key, m.schema);
    // 2. it is registered under its own plugin and operation
    if (m.plugin !== plugin || m.operation !== operation) {
      throw new Error(`${m.key}: registered as ${plugin}/${operation}`);
    }
    // 3. its key is <plugin>_<operation>
    if (m.key !== `${plugin}_${operation}`) {
      throw new Error(`${m.key}: key must be ${plugin}_${operation}`);
    }
  }
}

export function listModels(): ModelDefinition[] {
  return [...MODELS];
}

/** The operation for `POST /v1/jobs/:plugin/:operation`, if there is one. */
export function getOperation(
  plugin: string,
  operation: string,
): ModelDefinition | undefined {
  // Only real plugins and operations, never built-in keys like "constructor".
  if (!Object.hasOwn(PLUGINS, plugin)) return undefined;
  const operations = PLUGINS[plugin]!;
  if (!Object.hasOwn(operations, operation)) return undefined;
  return operations[operation];
}

/** A job's model, from the key it stored. */
export function getModel(key: string): ModelDefinition | undefined {
  return MODELS.find((m) => m.key === key);
}

export type PublicModel = {
  key: string;
  plugin: string;
  operation: string;
  name: string;
  kind: ModelKind;
  category: readonly string[];
  description: string;
  credits: { min: number; max: number };
  input: Record<string, FieldSchema>;
};

/** What `GET /v1/models` shows. Never includes the fal endpoint. */
export function publicModel(
  m: ModelDefinition,
  credits: { min: number; max: number },
): PublicModel {
  return {
    key: m.key,
    plugin: m.plugin,
    operation: m.operation,
    name: m.displayName,
    kind: m.kind,
    category: m.schema.info.category,
    description: m.schema.info.description,
    credits,
    input: publicInput(m.schema),
  };
}
