import { getModel } from "../../src/models/registry.js";

/**
 * A createJob body for a model key: its plugin and operation, and an input
 * made of the prompt, the options and the uploads (in the model's image field).
 */
export function jobBody(
  key: string,
  p: {
    prompt: string;
    uploadIds?: string[];
    options?: Record<string, unknown>;
  },
): { plugin: string; operation: string; input: Record<string, unknown> } {
  const model = getModel(key);
  if (!model) throw new Error(`No model ${key}`);
  const input: Record<string, unknown> = { prompt: p.prompt, ...p.options };
  if (p.uploadIds?.length) input[model.uploads.field ?? "image"] = p.uploadIds;
  return { plugin: model.plugin, operation: model.operation, input };
}
