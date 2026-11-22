import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  inputValidator,
  optionsValidator,
  publicInput,
  optionsIn,
  uploadCountRange,
  uploadIdsIn,
  uploadRules,
} from "../../src/models/schemaGenerator.js";
import { schema as flux } from "../../src/models/plugins/fluxSchnell/generate/schema.js";
import { schema as kling } from "../../src/models/plugins/kling21/generate/schema.js";
import type { ModelSchema } from "../../src/models/types.js";

const ok = (schema: ModelSchema, input: unknown) =>
  inputValidator(schema).safeParse(input).success;

describe("inputValidator", () => {
  it("takes the prompt limit from each model's schema", () => {
    const prompt = "a".repeat(2100);
    expect(ok(flux, { prompt })).toBe(false);
    expect(ok(kling, { prompt })).toBe(true);
    expect(ok(kling, { prompt: "a".repeat(2501) })).toBe(false);
  });

  it("rejects a required prompt that is missing or blank", () => {
    expect(ok(flux, {})).toBe(false);
    expect(ok(flux, { prompt: "   " })).toBe(false);
  });

  it("lets an optional prompt be left out", () => {
    const optional: ModelSchema = {
      ...flux,
      input: {
        ...flux.input,
        prompt: { type: "string", description: "Optional", maxLength: 2000 },
      },
    };
    expect(ok(optional, {})).toBe(true);
  });

  it("enforces required on any string field", () => {
    const withNegative: ModelSchema = {
      ...flux,
      input: {
        ...flux.input,
        negative_prompt: {
          type: "string",
          description: "What to keep out of the image",
          required: true,
          maxLength: 100,
        },
      },
    };
    expect(ok(withNegative, { prompt: "a cat" })).toBe(false);
    expect(ok(withNegative, { prompt: "a cat", negative_prompt: " " })).toBe(
      false,
    );
    expect(ok(withNegative, { prompt: "a cat", negative_prompt: "blur" })).toBe(
      true,
    );
  });

  it("takes upload ids in the image field, up to maxItems", () => {
    const one = [randomUUID()];
    expect(ok(kling, { prompt: "waves" })).toBe(true);
    expect(ok(kling, { prompt: "waves", image: one })).toBe(true);
    expect(
      ok(kling, { prompt: "waves", image: [randomUUID(), randomUUID()] }),
    ).toBe(false);
    expect(ok(kling, { prompt: "waves", image: ["not-an-id"] })).toBe(false);
  });

  it("needs an upload when the image field is required", () => {
    const required = {
      ...kling,
      input: {
        ...kling.input,
        image: { ...kling.input.image!, required: true },
      },
    } as ModelSchema;
    expect(ok(required, { prompt: "waves" })).toBe(false);
    expect(ok(required, { prompt: "waves", image: [] })).toBe(false);
    expect(ok(required, { prompt: "waves", image: [randomUUID()] })).toBe(true);
  });

  it("fills in defaults, with no uploads when the image is left out", () => {
    expect(inputValidator(kling).parse({ prompt: "waves" })).toEqual({
      prompt: "waves",
      image: [],
      duration: "5",
      aspect_ratio: "16:9",
    });
  });

  it("rejects a field the schema doesn't declare", () => {
    expect(ok(flux, { prompt: "a cat", image: [randomUUID()] })).toBe(false);
    expect(ok(kling, { prompt: "waves", durations: "5" })).toBe(false);
  });

  it("checks every other field by its own rules", () => {
    expect(ok(kling, { prompt: "waves", duration: "7" })).toBe(false);
    expect(ok(flux, { prompt: "a cat", num_images: 5 })).toBe(false);
  });
});

describe("optionsValidator", () => {
  it("applies defaults", () => {
    expect(optionsValidator(flux).parse({})).toEqual({
      image_size: "landscape_4_3",
      num_images: 1,
    });
    expect(optionsValidator(kling).parse({})).toEqual({
      duration: "5",
      aspect_ratio: "16:9",
    });
  });

  it("rejects values outside an enum or a range", () => {
    expect(optionsValidator(kling).safeParse({ duration: "7" }).success).toBe(
      false,
    );
    expect(optionsValidator(flux).safeParse({ num_images: 5 }).success).toBe(
      false,
    );
    expect(optionsValidator(flux).safeParse({ num_images: 0 }).success).toBe(
      false,
    );
    expect(optionsValidator(flux).safeParse({ num_images: 1.5 }).success).toBe(
      false,
    );
  });

  it("leaves out the prompt and the image", () => {
    expect(Object.keys(optionsValidator(kling).shape)).toEqual([
      "duration",
      "aspect_ratio",
    ]);
  });
});

describe("uploadRules", () => {
  it("is empty without an upload field", () => {
    expect(uploadRules(flux)).toEqual([]);
  });

  it("is optional (min 0) for an optional image field", () => {
    expect(uploadRules(kling)[0]).toEqual({
      field: "image",
      kind: "image",
      min: 0,
      max: 1,
      supportedContentTypes: [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif",
        "image/bmp",
      ],
    });
  });

  it("is min 1 for a required image field", () => {
    const required = {
      ...kling,
      input: {
        ...kling.input,
        image: { ...kling.input.image!, required: true },
      },
    };
    expect(uploadRules(required)[0]!.min).toBe(1);
  });

  it("lists every upload field in order, images and a clip, with their totals", () => {
    const motion = {
      ...kling,
      input: {
        ...kling.input,
        end_image: { ...kling.input.image!, required: false },
        video: {
          type: "video" as const,
          description: "Clip",
          required: true,
          maxItems: 1,
          supportedContentTypes: ["video/mp4"],
        },
      },
    };
    const rules = uploadRules(motion);
    expect(
      rules.map((rule) => [rule.field, rule.kind, rule.min, rule.max]),
    ).toEqual([
      ["image", "image", 0, 1],
      ["end_image", "image", 0, 1],
      ["video", "video", 1, 1],
    ]);
    expect(uploadCountRange(rules)).toEqual({ min: 1, max: 3 });
    const input = { prompt: "x", duration: "5", image: ["a"], video: ["c"] };
    expect(uploadIdsIn(rules, input)).toEqual(["a", "c"]);
    expect(optionsIn(rules, input)).toEqual({ duration: "5" });
  });
});

describe("publicInput", () => {
  it("keeps descriptions, enums and defaults", () => {
    const input = publicInput(kling);
    expect(input.prompt?.description).toBe(
      "Text description of what you want to generate",
    );
    expect(input.duration).toMatchObject({
      type: "string",
      enum: ["5", "10"],
      default: "5",
    });
  });
});
