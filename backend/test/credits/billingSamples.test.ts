import { describe, expect, it } from "vitest";
import { billingSamples } from "../../src/credits/billingSamples.js";
import { fluxSchnell } from "../../src/models/flux-schnell/index.js";
import { kling21 } from "../../src/models/kling21/index.js";
import {
  optionsValidator,
  uploadRule,
} from "../../src/models/schemaGenerator.js";
import type {
  BillingFacts,
  FieldSchema,
  ModelDefinition,
  ModelSchema,
} from "../../src/models/types.js";

/** A model with these inputs besides the prompt. Its facts are its options plus `uploads`. */
function testModel(input: Record<string, FieldSchema>): ModelDefinition {
  const schema: ModelSchema = {
    ...fluxSchnell.schema,
    info: { ...fluxSchnell.schema.info, name: "test-model" },
    input: { prompt: fluxSchnell.schema.input.prompt!, ...input },
  };
  return {
    ...fluxSchnell,
    key: "test-model",
    schema,
    uploads: uploadRule(schema),
    options: optionsValidator(schema),
    billingInputs: ({ options, uploadCount }) => ({
      ...(options as BillingFacts),
      uploads: uploadCount,
    }),
  };
}

const integer = (minimum: number, maximum: number): FieldSchema => ({
  type: "integer",
  description: "n",
  minimum,
  maximum,
  default: minimum,
});

/** Samples as sorted JSON strings, so a set of samples compares in any order. */
const asSet = (samples: BillingFacts[]) =>
  samples.map((s) => JSON.stringify(s)).sort();

describe("billingSamples", () => {
  it("kling21: every duration and aspect ratio, without and with an image", () => {
    const samples = billingSamples(kling21);
    const expected: BillingFacts[] = [];
    for (const image of [false, true]) {
      for (const duration of [5, 10]) {
        for (const aspect_ratio of ["9:16", "16:9", "1:1"]) {
          expected.push({ duration, aspect_ratio, image });
        }
      }
    }
    expect(asSet(samples)).toEqual(asSet(expected));
  });

  it("flux: every image size and image count, never an image", () => {
    const samples = billingSamples(fluxSchnell);
    expect(samples).toHaveLength(6 * 4);
    expect(new Set(samples.map((s) => s.images))).toEqual(
      new Set([1, 2, 3, 4]),
    );
    expect(new Set(samples.map((s) => s.image_size)).size).toBe(6);
    expect(samples.every((s) => s.image === false)).toBe(true);
  });

  it("gives each sample exactly the facts billingInputs gives a job", () => {
    for (const sample of billingSamples(kling21)) {
      const options = { duration: String(sample.duration) };
      const job = kling21.billingInputs({
        options: kling21.options.parse({
          ...options,
          aspect_ratio: sample.aspect_ratio,
        }),
        uploadCount: sample.image ? 1 : 0,
      });
      expect(sample).toEqual(job);
    }
  });

  it("takes a boolean both ways and an integer at every value from minimum to maximum", () => {
    const model = testModel({
      loop: { type: "boolean", description: "b", default: false },
      steps: integer(2, 4),
    });
    expect(asSet(billingSamples(model))).toEqual(
      asSet(
        [true, false].flatMap((loop) =>
          [2, 3, 4].map((steps) => ({ loop, steps, uploads: 0 })),
        ),
      ),
    );
  });

  it("takes a free-text string at its default, or leaves it out when it has none", () => {
    const model = testModel({
      seed: { type: "string", description: "s", default: "abc" },
      note: { type: "string", description: "n" },
    });
    expect(billingSamples(model)).toEqual([{ seed: "abc", uploads: 0 }]);
  });

  it("takes an enum at each value, and also left out when it has no default", () => {
    const model = testModel({
      size: {
        type: "string",
        description: "s",
        enum: ["s", "m"],
        default: "s",
      },
      style: { type: "string", description: "t", enum: ["a", "b"] },
    });
    expect(asSet(billingSamples(model))).toEqual(
      asSet([
        { size: "s", style: "a", uploads: 0 },
        { size: "s", style: "b", uploads: 0 },
        { size: "s", uploads: 0 },
        { size: "m", style: "a", uploads: 0 },
        { size: "m", style: "b", uploads: 0 },
        { size: "m", uploads: 0 },
      ]),
    );
  });

  it("takes every upload count from uploads.min to uploads.max, and never the prompt or the image field", () => {
    const model = testModel({
      photos: {
        type: "image",
        description: "p",
        required: false,
        maxItems: 3,
        supportedContentTypes: ["image/png"],
      },
    });
    expect(billingSamples(model)).toEqual([
      { uploads: 0 },
      { uploads: 1 },
      { uploads: 2 },
      { uploads: 3 },
    ]);
  });

  it("allows exactly 10000 combinations", () => {
    const model = testModel({ a: integer(1, 100), b: integer(1, 100) });
    expect(billingSamples(model)).toHaveLength(10000);
  });

  it("throws, naming the model, above 10000 combinations", () => {
    const model = testModel({ a: integer(1, 100), b: integer(1, 101) });
    expect(() => billingSamples(model)).toThrow(/test-model.*10000/);
  });

  it("throws quickly on a huge integer range instead of listing it", () => {
    const model = testModel({ a: integer(0, 1e12) });
    expect(() => billingSamples(model)).toThrow(/test-model.*10000/);
  });
});
