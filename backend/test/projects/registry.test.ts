import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import {
  getProjectType,
  listProjectTypes,
} from "../../src/projects/registry.js";
import { aiInfluencer } from "../../src/projects/types/aiInfluencer.js";
import { influencerStyle } from "../../src/projects/types/influencerStyle.js";

describe("project type registry", () => {
  it("finds ai-influencer with image models", () => {
    expect(getProjectType("ai-influencer")?.modelKinds).toEqual(["image"]);
  });

  it("finds influencer-style with no models and an upload field", () => {
    expect(getProjectType("influencer-style")?.modelKinds).toEqual([]);
    expect(getProjectType("influencer-style")?.uploadField).toBe("uploadId");
  });

  it("does not treat built-in keys or unknown names as types", () => {
    expect(getProjectType("constructor")).toBeUndefined();
    expect(getProjectType("nope")).toBeUndefined();
  });

  it("lists the types", () => {
    expect(listProjectTypes()).toEqual(["ai-influencer", "influencer-style"]);
  });
});

describe("influencer-style data", () => {
  const uploadId = "6f1c8e1e-6a0a-4d55-9a3a-2a7f0d6f5b11";

  it("keeps the upload id", () => {
    expect(influencerStyle.data.parse({ uploadId })).toEqual({ uploadId });
  });

  it.each([
    ["no upload id", {}],
    ["an upload id that is not a uuid", { uploadId: "abc" }],
    ["an unknown field", { uploadId, url: "https://x" }],
  ])("rejects %s", (_name, input) => {
    expect(() => influencerStyle.data.parse(input)).toThrow(ZodError);
  });
});

describe("ai-influencer data", () => {
  it("defaults traits to an empty object", () => {
    expect(aiInfluencer.data.parse({})).toEqual({ traits: {} });
  });

  it("trims extra and keeps archetypeId", () => {
    const out = aiInfluencer.data.parse({
      traits: { gender: "woman" },
      extra: "  freckles ",
      archetypeId: "street",
    });
    expect(out.extra).toBe("freckles");
    expect(out.archetypeId).toBe("street");
  });

  it("accepts the character type trait", () => {
    expect(
      aiInfluencer.data.parse({ traits: { character: "kitty" } }).traits,
    ).toEqual({ character: "kitty" });
  });

  it.each([
    ["unknown trait key", { traits: { wings: "yes" } }],
    ["trait too long", { traits: { gender: "x".repeat(41) } }],
    ["extra too long", { extra: "x".repeat(501) }],
    ["archetypeId too long", { archetypeId: "x".repeat(61) }],
    ["unknown field", { other: 1 }],
  ])("rejects %s", (_name, input) => {
    expect(() => aiInfluencer.data.parse(input)).toThrow(ZodError);
  });
});
