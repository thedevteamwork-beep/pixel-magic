import { z } from "zod";
import type { FieldSchema, ModelSchema } from "./types.js";

type ImageField = Extract<FieldSchema, { type: "image" }>;
type StringField = Extract<FieldSchema, { type: "string" }>;

const NO_LIMIT = Number.MAX_SAFE_INTEGER;

/** The image field and its name, if the model has one. */
function imageField(schema: ModelSchema): [string, ImageField] | undefined {
  return Object.entries(schema.input).find(
    (entry): entry is [string, ImageField] => entry[1].type === "image",
  );
}

function notBlank(value: string): boolean {
  return value.trim().length > 0;
}

function stringValidator(field: StringField) {
  const base: z.ZodType<string> = field.enum
    ? z.enum(field.enum as [string, ...string[]])
    : z.string().max(field.maxLength ?? NO_LIMIT);
  // 1. A required string must be sent, and can't be blank.
  if (field.required) return base.refine(notBlank, "Must not be blank");
  // 2. Otherwise a missing value takes the default, if there is one.
  if (field.default !== undefined) return base.default(field.default);
  // 3. Without a default it can be left out.
  return base.optional();
}

/** The image field holds upload ids. */
function imageValidator(field: ImageField) {
  const uploadIds = z.array(z.string().uuid()).max(field.maxItems);
  // 1. A required image needs at least one upload.
  if (field.required) return uploadIds.min(1);
  // 2. Otherwise it can be left out, meaning no uploads.
  return uploadIds.default([]);
}

function fieldValidator(field: Exclude<FieldSchema, { type: "image" }>) {
  switch (field.type) {
    case "string":
      return stringValidator(field);
    case "integer":
      return z
        .number()
        .int()
        .min(field.minimum)
        .max(field.maximum)
        .default(field.default);
    case "boolean":
      return z.boolean().default(field.default);
  }
}

/** The fields a price can depend on: every input except `prompt` and the image. */
export function optionsValidator(schema: ModelSchema): z.ZodObject {
  const shape: Record<string, z.ZodType> = {};
  for (const [name, field] of Object.entries(schema.input)) {
    if (name === "prompt" || field.type === "image") continue;
    shape[name] = fieldValidator(field);
  }
  return z.strictObject(shape);
}

/**
 * Validates a job's input, as in jiraiya: every field `schema.input`
 * declares, each by its own rules, and nothing else.
 */
export function inputValidator(schema: ModelSchema): z.ZodObject {
  const shape: Record<string, z.ZodType> = {};
  for (const [name, field] of Object.entries(schema.input)) {
    shape[name] =
      field.type === "image" ? imageValidator(field) : fieldValidator(field);
  }
  return z.strictObject(shape);
}

export function uploadRule(schema: ModelSchema): {
  field: string | undefined;
  min: number;
  max: number;
  supportedContentTypes: string[];
} {
  const image = imageField(schema);
  if (!image) {
    return { field: undefined, min: 0, max: 0, supportedContentTypes: [] };
  }
  const [name, field] = image;
  return {
    field: name,
    min: field.required ? 1 : 0,
    max: field.maxItems,
    supportedContentTypes: [...field.supportedContentTypes],
  };
}

/** The upload ids in a validated input: the image field's value, or none. */
export function uploadIdsIn(
  uploads: { field: string | undefined },
  input: Record<string, unknown>,
): string[] {
  if (!uploads.field) return [];
  return (input[uploads.field] as string[] | undefined) ?? [];
}

/** The options in a validated input, for pricing: every field but `prompt` and the image. */
export function optionsIn(
  uploads: { field: string | undefined },
  input: Record<string, unknown>,
): Record<string, unknown> {
  const options = { ...input };
  delete options.prompt;
  if (uploads.field) delete options[uploads.field];
  return options;
}

/** The `input` map shown by `GET /v1/models`. */
export function publicInput(schema: ModelSchema): Record<string, FieldSchema> {
  return schema.input;
}
