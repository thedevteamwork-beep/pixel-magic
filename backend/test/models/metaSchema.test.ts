import { describe, expect, it } from "vitest";
import { optionsValidator } from "../../src/models/schemaGenerator.js";
import type { ModelSchema } from "../../src/models/types.js";
import { validateModelSchema } from "../../src/models/metaSchema.js";
import { schema as flux } from "../../src/models/plugins/fluxSchnell/generate/schema.js";
import { schema as kling } from "../../src/models/plugins/kling21/generate/schema.js";

// Loose on purpose: tests mutate the schema into invalid shapes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = Record<string, any>;

const clone = () => structuredClone(kling) as Rec;

describe("validateModelSchema", () => {
  it("accepts both registered models", () => {
    expect(() => validateModelSchema("kling21_generate", kling)).not.toThrow();
    expect(() =>
      validateModelSchema("fluxSchnell_generate", flux),
    ).not.toThrow();
  });

  it("requires a strict billing block of supported units", () => {
    const s = clone();
    delete s.billing;
    expect(() => validateModelSchema("kling21_generate", s)).toThrow(/billing/);
    s.billing = { units: ["video_seconds"] };
    expect(() => validateModelSchema("kling21_generate", s)).toThrow(
      /billing\.units/,
    );
    s.billing = { units: ["duration"], extra: 1 };
    expect(() => validateModelSchema("kling21_generate", s)).toThrow(
      /billing.*extra/,
    );
  });

  it("rejects empty or duplicate billing units", () => {
    const s = clone();
    s.billing = { units: [] };
    expect(() => validateModelSchema("kling21_generate", s)).toThrow(
      /billing\.units/,
    );
    s.billing = { units: ["duration", "duration"] };
    expect(() => validateModelSchema("kling21_generate", s)).toThrow(
      /billing\.units.*duplicate/,
    );
  });

  it.each([
    ["info", "bannerImg", (s: Rec) => (s.info.bannerImg = "x")],
    ["input.duration", "defualt", (s: Rec) => (s.input.duration.defualt = "5")],
    ["output", "extra", (s: Rec) => (s.output.extra = 1)],
    ["", "extra", (s: Rec) => (s.extra = 1)],
  ])(
    "rejects an unknown property under %j (%s) naming path and key",
    (path, key, mutate) => {
      const s = clone();
      mutate(s);
      const msg = new RegExp(
        `^Model kling21_generate schema invalid: ${path.replaceAll(".", "\\.")}.*${key}`,
      );
      expect(() => validateModelSchema("kling21_generate", s)).toThrow(msg);
    },
  );

  it("rejects a bad field key", () => {
    const s = clone();
    s.input["bad-key"] = { type: "boolean", description: "x", default: true };
    expect(() => validateModelSchema("kling21_generate", s)).toThrow(
      /input.*bad-key/,
    );
  });

  it("rejects a default outside the enum", () => {
    const s = clone();
    s.input.duration.default = "7";
    expect(() => validateModelSchema("kling21_generate", s)).toThrow(
      /duration/,
    );
  });

  it("rejects an integer default outside minimum..maximum", () => {
    const s = structuredClone(flux) as Rec;
    s.input.num_images.default = 9;
    expect(() => validateModelSchema("fluxSchnell_generate", s)).toThrow(
      /num_images/,
    );
    s.input.num_images.default = 0;
    expect(() => validateModelSchema("fluxSchnell_generate", s)).toThrow(
      /num_images/,
    );
  });

  it("rejects two image fields", () => {
    const s = clone();
    s.input.image2 = structuredClone(s.input.image);
    expect(() => validateModelSchema("kling21_generate", s)).toThrow(
      /at most one image/,
    );
  });

  it("accepts a model with no prompt: it is just another field", () => {
    const s = clone();
    delete s.input.prompt;
    expect(() => validateModelSchema("kling21_generate", s)).not.toThrow();
  });
});

describe("optionsValidator", () => {
  it("lets an optional string without a default be left out", () => {
    const s = structuredClone(kling) as Rec;
    s.input.style = { type: "string", description: "Style" };
    const parsed = optionsValidator(s as ModelSchema).parse({});
    expect(parsed).not.toHaveProperty("style");
  });
});
