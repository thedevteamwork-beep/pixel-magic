import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import {
  getProjectType,
  listProjectTypes,
} from "../../src/projects/registry.js";
import { aiInfluencer } from "../../src/projects/types/aiInfluencer.js";

describe("project type registry", () => {
  it("finds ai-influencer with image models", () => {
    expect(getProjectType("ai-influencer")?.modelKinds).toEqual(["image"]);
  });

  it("does not treat built-in keys or unknown names as types", () => {
    expect(getProjectType("constructor")).toBeUndefined();
    expect(getProjectType("nope")).toBeUndefined();
  });

  it("lists the types", () => {
    expect(listProjectTypes()).toEqual(["ai-influencer"]);
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
