import { z } from "zod";
import type { FieldSchema, ModelSchema } from "./types.js";

type ImageField = Extract<FieldSchema, { type: "image" }>;

function imageField(schema: ModelSchema): ImageField | undefined {
  return Object.values(schema.input).find(
    (f): f is ImageField => f.type === "image",
  );
}

function fieldValidator(field: Exclude<FieldSchema, { type: "image" }>) {
  switch (field.type) {
    case "string": {
      const base = field.enum
        ? z.enum(field.enum as [string, ...string[]])
        : z.string().max(field.maxLength ?? Number.MAX_SAFE_INTEGER);
      return field.default === undefined ? base : base.default(field.default);
    }
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

/** Validates the user's options: every field except `prompt` and the image. */
export function optionsValidator(schema: ModelSchema): z.ZodObject {
  const shape: Record<string, z.ZodType> = {};
  for (const [name, field] of Object.entries(schema.input)) {
    if (name === "prompt" || field.type === "image") continue;
    shape[name] = fieldValidator(field);
  }
  return z.object(shape);
}

export function promptRule(schema: ModelSchema): {
  required: boolean;
  maxLength: number;
} {
  const field = schema.input.prompt;
  if (field?.type !== "string") {
    throw new Error(`${schema.info.name}: input.prompt must be a string`);
  }
  return {
    required: field.required ?? false,
    maxLength: field.maxLength ?? Number.MAX_SAFE_INTEGER,
  };
}

export function uploadRule(schema: ModelSchema): {
  min: number;
  max: number;
  supportedContentTypes: string[];
} {
  const field = imageField(schema);
  if (!field) return { min: 0, max: 0, supportedContentTypes: [] };
  return {
    min: field.required ? 1 : 0,
    max: field.maxItems,
    supportedContentTypes: [...field.supportedContentTypes],
  };
}

/** The `input` map shown by `GET /v1/models`. */
export function publicInput(schema: ModelSchema): Record<string, FieldSchema> {
  return schema.input;
}
