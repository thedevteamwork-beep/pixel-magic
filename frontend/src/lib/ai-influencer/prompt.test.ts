import { describe, expect, it } from "vitest";
import { defaultTraits } from "@/components/ai-influencer/constants";
import { composeInfluencerPrompt, displayName, seedFrom, traitLabel } from "./prompt";

const everyTrait = {
  ...defaultTraits,
  ethnicity: "south-asian",
  skinTone: "olive",
  hairStyle: "long-waves",
  hairColor: "black",
  eyeColor: "brown",
  build: "slim",
  outfit: "streetwear",
  setting: "city-street",
};

describe("composeInfluencerPrompt", () => {
  it("describes every chosen trait in readable words", () => {
    const prompt = composeInfluencerPrompt(everyTrait);
    expect(prompt).toContain("late 20s south asian woman");
    expect(prompt).toContain("olive skin, black long waves hair, brown eyes, slim build");
    expect(prompt).toContain("wearing streetwear, city street");
  });

  it("leaves out traits that were not chosen", () => {
    const prompt = composeInfluencerPrompt(defaultTraits);
    expect(prompt).toContain("A photorealistic portrait of a late 20s woman.");
    expect(prompt).not.toContain("skin,");
    expect(prompt).not.toContain("hair");
    expect(prompt).not.toContain("wearing");
  });

  it("handles a hair style or colour on its own", () => {
    expect(composeInfluencerPrompt({ ...defaultTraits, hairStyle: "bob" })).toContain("bob hair");
    expect(composeInfluencerPrompt({ ...defaultTraits, hairColor: "blonde" })).toContain("blonde hair");
  });

  it("appends trimmed extra direction", () => {
    expect(composeInfluencerPrompt({ ...defaultTraits, extra: "  freckles  " })).toContain("freckles.");
  });
});

describe("reference photo", () => {
  it("asks to keep the uploaded likeness only when a photo is attached", () => {
    expect(composeInfluencerPrompt(defaultTraits)).not.toContain("reference photo");
    expect(composeInfluencerPrompt(defaultTraits, true)).toContain("likeness of the uploaded reference photo");
  });
});

describe("helpers", () => {
  it("falls back to the raw value for unknown options", () => {
    expect(traitLabel("gender", "unknown")).toBe("unknown");
  });
  it("names unnamed influencers", () => {
    expect(displayName(defaultTraits)).toBe("Untitled influencer");
    expect(displayName({ ...defaultTraits, name: " Mira " })).toBe("Mira");
  });
  it("hashes deterministically", () => {
    expect(seedFrom("a")).toBe(seedFrom("a"));
    expect(seedFrom("a")).not.toBe(seedFrom("b"));
  });
});
