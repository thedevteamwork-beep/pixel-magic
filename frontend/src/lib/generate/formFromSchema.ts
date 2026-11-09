import type { FieldSchema, PublicModel } from "@/lib/api/types";

type ImageField = Extract<FieldSchema, { type: "image" }>;

const IMAGE_TYPE = "image";

/** The model's image input, or `undefined` for text-only models. */
export function imageField(model: PublicModel): ImageField | undefined {
  for (const field of Object.values(model.input)) {
    if (field.type === IMAGE_TYPE) return field as ImageField;
  }
  return undefined;
}

/** The name of the model's image input, or `undefined` for text-only models. */
export function imageFieldName(model: PublicModel): string | undefined {
  for (const [name, field] of Object.entries(model.input)) {
    if (field.type === IMAGE_TYPE) return name;
  }
  return undefined;
}

/** Every input except the prompt and the image: the fields shown as options. */
export function optionFields(model: PublicModel): [string, FieldSchema][] {
  return Object.entries(model.input).filter(([name, field]) => name !== "prompt" && field.type !== IMAGE_TYPE);
}

/** Each option's default. An optional string without a default is left out. */
export function defaultOptions(model: PublicModel): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const [name, field] of optionFields(model)) {
    if ("default" in field && field.default !== undefined) defaults[name] = field.default;
  }
  return defaults;
}

/** The options to send: defaults, then the form's values; only keys the model declares, integers as numbers. */
export function buildOptions(model: PublicModel, values: Record<string, unknown>): Record<string, unknown> {
  const options = defaultOptions(model);
  for (const [name, field] of optionFields(model)) {
    const value = values[name];
    if (value === undefined || value === "") continue; // an empty box keeps the default, or sends nothing
    options[name] = field.type === "integer" ? Number(value) : value;
  }
  return options;
}

/**
 * The job's `input`: the options, the prompt (when the model has one) and the
 * upload ids in the model's image field. The backend checks it against the schema.
 */
export function buildInput(
  model: PublicModel,
  p: { prompt: string; values: Record<string, unknown>; uploadIds: string[] },
): Record<string, unknown> {
  const input = buildOptions(model, p.values);
  if (model.input.prompt) input.prompt = p.prompt;
  const image = imageFieldName(model);
  if (image && p.uploadIds.length > 0) input[image] = p.uploadIds;
  return input;
}
