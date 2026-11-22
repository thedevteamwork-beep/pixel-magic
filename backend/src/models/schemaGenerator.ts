import { z } from "zod";
import type {
  FieldSchema,
  ModelSchema,
  UploadFieldSchema,
  UploadRule,
} from "./types.js";

type StringField = Extract<FieldSchema, { type: "string" }>;
type OptionField = Exclude<FieldSchema, UploadFieldSchema>;

const NO_LIMIT = Number.MAX_SAFE_INTEGER;

export function isUploadField(field: FieldSchema): field is UploadFieldSchema {
  return field.type === "image" || field.type === "video";
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

/** An upload field holds upload ids. */
function uploadValidator(field: UploadFieldSchema) {
  const uploadIds = z.array(z.string().uuid()).max(field.maxItems);
  // 1. A required field needs at least one upload.
  if (field.required) return uploadIds.min(1);
  // 2. Otherwise it can be left out, meaning no uploads.
  return uploadIds.default([]);
}

function fieldValidator(field: OptionField) {
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

/** The fields a price can depend on: every input except `prompt` and the upload fields. */
export function optionsValidator(schema: ModelSchema): z.ZodObject {
  const shape: Record<string, z.ZodType> = {};
  for (const [name, field] of Object.entries(schema.input)) {
    if (name === "prompt" || isUploadField(field)) continue;
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
    shape[name] = isUploadField(field)
      ? uploadValidator(field)
      : fieldValidator(field);
  }
  return z.strictObject(shape);
}

/** Every upload field of a schema, in its order. */
export function uploadRules(schema: ModelSchema): UploadRule[] {
  return Object.entries(schema.input).flatMap(([field, schemaField]) =>
    isUploadField(schemaField)
      ? [
          {
            field,
            kind: schemaField.type,
            min: schemaField.required ? 1 : 0,
            max: schemaField.maxItems,
            supportedContentTypes: [...schemaField.supportedContentTypes],
          },
        ]
      : [],
  );
}

/** The fewest and the most uploads a job can have, over every field. */
export function uploadCountRange(rules: readonly UploadRule[]): {
  min: number;
  max: number;
} {
  return rules.reduce(
    (range, rule) => ({ min: range.min + rule.min, max: range.max + rule.max }),
    {
      min: 0,
      max: 0,
    },
  );
}

/** One field's upload ids in a validated input. */
export function uploadIdsOf(
  rule: Pick<UploadRule, "field">,
  input: Record<string, unknown>,
): string[] {
  return (input[rule.field] as string[] | undefined) ?? [];
}

/** Every upload id in a validated input, field by field in schema order. */
export function uploadIdsIn(
  rules: readonly UploadRule[],
  input: Record<string, unknown>,
): string[] {
  return rules.flatMap((rule) => uploadIdsOf(rule, input));
}

/** The options in a validated input, for pricing: every field but `prompt` and the upload fields. */
export function optionsIn(
  rules: readonly UploadRule[],
  input: Record<string, unknown>,
): Record<string, unknown> {
  const options = { ...input };
  delete options.prompt;
  for (const rule of rules) delete options[rule.field];
  return options;
}

/** The `input` map shown by `GET /v1/models`. */
export function publicInput(schema: ModelSchema): Record<string, FieldSchema> {
  return schema.input;
}
