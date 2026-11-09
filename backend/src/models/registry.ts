import type { FieldSchema, ModelDefinition, ModelKind } from "./types.js";
import { validateModelSchema } from "./metaSchema.js";
import { fluxSchnell } from "./plugins/fluxSchnell/index.js";
import { kling21 } from "./plugins/kling21/index.js";
import { publicInput } from "./schemaGenerator.js";

/** Every plugin and its operations, like jiraiya's `predictionBackends`. */
const PLUGINS: Record<string, Record<string, ModelDefinition>> = {
  fluxSchnell,
  kling21,
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
