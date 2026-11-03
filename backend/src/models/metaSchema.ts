import { z } from "zod";

// The shape every model schema must have. Strict everywhere, so a typo in a
// model file fails at startup instead of being silently ignored.

const description = z.string();

const stringField = z
  .object({
    type: z.literal("string"),
    description,
    enum: z.array(z.string()).min(1).optional(),
    default: z.string().optional(),
    required: z.boolean().optional(),
    maxLength: z.number().int().positive().optional(),
  })
  .strict();

const integerField = z
  .object({
    type: z.literal("integer"),
    description,
    minimum: z.number().int(),
    maximum: z.number().int(),
    default: z.number().int(),
  })
  .strict();

const booleanField = z
  .object({ type: z.literal("boolean"), description, default: z.boolean() })
  .strict();

const imageField = z
  .object({
    type: z.literal("image"),
    description,
    required: z.boolean(),
    maxItems: z.number().int().positive(),
    supportedContentTypes: z.array(z.string()).min(1),
  })
  .strict();

const field = z.discriminatedUnion("type", [
  stringField,
  integerField,
  booleanField,
  imageField,
]);

export const ModelSchemaShape = z
  .object({
    info: z
      .object({
        name: z.string().min(1),
        displayName: z.string().min(1),
        kind: z.enum(["image", "video"]),
        category: z.array(z.string()),
        description: z.string(),
        bannerImage: z.string().optional(),
        logo: z.string().optional(),
      })
      .strict(),
    input: z.record(z.string().regex(/^[a-zA-Z0-9_]+$/), field),
    output: z
      .object({ description: z.string(), mimeTypes: z.array(z.string()) })
      .strict(),
    billing: z
      .object({ units: z.array(z.string()) })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((s, ctx) => {
    const fail = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });
    if (s.input.prompt?.type !== "string") {
      fail(["input", "prompt"], "prompt must exist and be a string field");
    }
    const images = Object.values(s.input).filter((f) => f.type === "image");
    if (images.length > 1) {
      fail(["input"], "at most one image field is allowed");
    }
    for (const [name, f] of Object.entries(s.input)) {
      if (f.type === "string" && f.enum && f.default !== undefined) {
        if (!f.enum.includes(f.default)) {
          fail(
            ["input", name, "default"],
            "default must be one of the enum values",
          );
        }
      }
      if (f.type === "integer") {
        if (!(f.minimum <= f.default && f.default <= f.maximum)) {
          fail(
            ["input", name, "default"],
            "default must be between minimum and maximum",
          );
        }
      }
    }
  });

export type ModelSchema = z.output<typeof ModelSchemaShape>;

/** Checks a model's schema. Throws a message naming the model and the path. */
export function validateModelSchema(key: string, schema: unknown): ModelSchema {
  const r = ModelSchemaShape.safeParse(schema);
  if (r.success) return r.data;
  const issue = r.error.issues[0]!;
  const path = issue.path.map(String);
  // Unknown keys are reported on their parent object; name the first one.
  if (issue.code === "unrecognized_keys") path.push(issue.keys[0]!);
  const where = path.join(".") || "(root)";
  throw new Error(`Model ${key} schema invalid: ${where}: ${issue.message}`);
}
