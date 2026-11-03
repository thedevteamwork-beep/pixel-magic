import { z } from "zod";
import type { ModelSchema } from "./types.js";

// The allowed properties of a model schema, in the same order as types.ts.
// Every object is strict, so a typo in a model file stops the app at startup.

const stringField = z.strictObject({
  type: z.literal("string"),
  description: z.string(),
  enum: z.array(z.string()).optional(),
  default: z.string().optional(),
  required: z.boolean().optional(),
  maxLength: z.number().optional(),
});

const integerField = z.strictObject({
  type: z.literal("integer"),
  description: z.string(),
  minimum: z.number(),
  maximum: z.number(),
  default: z.number(),
});

const booleanField = z.strictObject({
  type: z.literal("boolean"),
  description: z.string(),
  default: z.boolean(),
});

const imageField = z.strictObject({
  type: z.literal("image"),
  description: z.string(),
  required: z.boolean(),
  maxItems: z.number(),
  supportedContentTypes: z.array(z.string()),
});

// One of the four field shapes, picked by its `type`.
const field = z.discriminatedUnion("type", [
  stringField,
  integerField,
  booleanField,
  imageField,
]);

const fieldKey = z.string().regex(/^[a-zA-Z0-9_]+$/);

const info = z.strictObject({
  name: z.string(),
  displayName: z.string(),
  kind: z.enum(["image", "video"]),
  category: z.array(z.string()),
  description: z.string(),
  bannerImage: z.string().optional(),
  logo: z.string().optional(),
});

const output = z.strictObject({
  description: z.string(),
  mimeTypes: z.array(z.string()),
});

const billing = z.strictObject({
  units: z.array(z.string()),
});

const modelSchema = z.strictObject({
  info,
  input: z.record(fieldKey, field),
  output,
  billing: billing.optional(),
});

/** Checks a model's schema. Throws a message naming the model and the path. */
export function validateModelSchema(key: string, schema: unknown): ModelSchema {
  const fail = (path: string, message: string): never => {
    throw new Error(`Model ${key} schema invalid: ${path}: ${message}`);
  };

  // Step 1: only the allowed properties, with the right types.
  const result = modelSchema.safeParse(schema);
  if (!result.success) {
    const issue = result.error.issues[0]!;
    return fail(issue.path.join(".") || "(root)", issue.message);
  }
  const parsed = result.data;

  // Step 2: rules the shape alone cannot express.
  // 1. input.prompt must be a string field
  if (parsed.input.prompt?.type !== "string") {
    fail("input.prompt", "must exist and be a string field");
  }
  // 2. at most one image field
  const images = Object.values(parsed.input).filter((f) => f.type === "image");
  if (images.length > 1) {
    fail("input", "at most one image field is allowed");
  }
  for (const [name, f] of Object.entries(parsed.input)) {
    // 3. an enum's default must be one of the enum values
    if (f.type === "string" && f.enum && f.default !== undefined) {
      if (!f.enum.includes(f.default)) {
        fail(`input.${name}.default`, "must be one of the enum values");
      }
    }
    // 4. minimum <= default <= maximum
    if (
      f.type === "integer" &&
      !(f.minimum <= f.default && f.default <= f.maximum)
    ) {
      fail(`input.${name}.default`, "must be between minimum and maximum");
    }
  }
  return parsed;
}
