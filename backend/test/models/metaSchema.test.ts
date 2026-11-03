import { describe, expect, it } from "vitest";
import { validateModelSchema } from "../../src/models/metaSchema.js";
import { schema as flux } from "../../src/models/flux-schnell/schema.js";
import { schema as kling } from "../../src/models/kling21/schema.js";

// Loose on purpose: tests mutate the schema into invalid shapes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = Record<string, any>;

const clone = () => structuredClone(kling) as Rec;

describe("validateModelSchema", () => {
  it("accepts both registered models", () => {
    expect(() => validateModelSchema("kling21", kling)).not.toThrow();
    expect(() => validateModelSchema("flux-schnell", flux)).not.toThrow();
  });

  it("accepts an optional strict billing block", () => {
    const s = clone();
    s.billing = { units: ["video_seconds"] };
    expect(() => validateModelSchema("kling21", s)).not.toThrow();
    s.billing = { units: [], extra: 1 };
    expect(() => validateModelSchema("kling21", s)).toThrow(/billing/);
  });

  it.each([
    ["info.bannerImg", (s: Rec) => (s.info.bannerImg = "x")],
    ["input.duration.defualt", (s: Rec) => (s.input.duration.defualt = "5")],
    ["output.extra", (s: Rec) => (s.output.extra = 1)],
    ["extra", (s: Rec) => (s.extra = 1)],
  ])(
    "rejects an unknown property at %s with its path in the message",
    (path, mutate) => {
      const s = clone();
      mutate(s);
      expect(() => validateModelSchema("kling21", s)).toThrow(
        new RegExp(
          `^Model kling21 schema invalid: ${path.replaceAll(".", "\\.")}`,
        ),
      );
    },
  );

  it("rejects a bad field key", () => {
    const s = clone();
    s.input["bad-key"] = { type: "boolean", description: "x", default: true };
    expect(() => validateModelSchema("kling21", s)).toThrow(/input/);
  });

  it("rejects a default outside the enum", () => {
    const s = clone();
    s.input.duration.default = "7";
    expect(() => validateModelSchema("kling21", s)).toThrow(/duration/);
  });

  it("rejects an integer default outside minimum..maximum", () => {
    const s = structuredClone(flux) as Rec;
    s.input.num_images.default = 9;
    expect(() => validateModelSchema("flux-schnell", s)).toThrow(/num_images/);
    s.input.num_images.default = 0;
    expect(() => validateModelSchema("flux-schnell", s)).toThrow(/num_images/);
  });

  it("rejects two image fields", () => {
    const s = clone();
    s.input.image2 = structuredClone(s.input.image);
    expect(() => validateModelSchema("kling21", s)).toThrow(/image/);
  });

  it("rejects a missing prompt", () => {
    const s = clone();
    delete s.input.prompt;
    expect(() => validateModelSchema("kling21", s)).toThrow(/prompt/);
  });
});
