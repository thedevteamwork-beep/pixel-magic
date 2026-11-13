import { describe, expect, it } from "vitest";
import { defaultTraits } from "@/constants/ai-influencer";
import { composeInfluencerPrompt, displayName, seedFrom, traitLabel } from "./prompt";

describe("composeInfluencerPrompt", () => {
  it("describes every trait in readable words", () => {
    const prompt = composeInfluencerPrompt(defaultTraits);
    expect(prompt).toContain("late 20s south asian woman");
    expect(prompt).toContain("black long waves hair");
    expect(prompt).toContain("wearing streetwear, city street");
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
