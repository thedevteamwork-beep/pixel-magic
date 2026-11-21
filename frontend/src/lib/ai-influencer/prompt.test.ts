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

describe("character type", () => {
  it("keeps the human prompt unchanged for a natural character", () => {
    expect(composeInfluencerPrompt({ ...everyTrait, character: "natural" })).toBe(composeInfluencerPrompt(everyTrait));
  });

  it("adds the look of an expressive or wild human character", () => {
    expect(composeInfluencerPrompt({ ...defaultTraits, character: "expressive" })).toContain(
      "bold, expressive features",
    );
    expect(composeInfluencerPrompt({ ...defaultTraits, character: "wild" })).toContain(
      "extreme, exaggerated, eccentric look",
    );
  });

  it("describes an animal character and drops human-only traits", () => {
    const prompt = composeInfluencerPrompt({ ...everyTrait, character: "kitty" });
    expect(prompt).toContain("A photorealistic portrait of an anthropomorphic cat character, female, late 20s");
    expect(prompt).toContain("black long waves hair, brown eyes");
    expect(prompt).not.toContain("south asian");
    expect(prompt).not.toContain("olive skin");
    expect(prompt).not.toContain("natural skin texture");
  });
});

describe("reference images", () => {
  it("mentions no reference when none is used", () => {
    expect(composeInfluencerPrompt(defaultTraits)).not.toContain("reference");
  });

  it("asks to keep the uploaded likeness when only the photo is used", () => {
    const prompt = composeInfluencerPrompt(defaultTraits, { photo: true });
    expect(prompt).toContain("keep the face and likeness of the uploaded reference photo");
    expect(prompt).not.toContain("styling");
  });

  it("asks to match the style image when only the style is used", () => {
    const prompt = composeInfluencerPrompt(defaultTraits, { style: true });
    expect(prompt).toContain("match the outfit, styling and mood of the style reference image");
    expect(prompt).not.toContain("likeness");
  });

  it("names the photo first and the style second when both are used", () => {
    const prompt = composeInfluencerPrompt(defaultTraits, { photo: true, style: true });
    expect(prompt).toContain("keep the face and likeness of the first reference image");
    expect(prompt).toContain("match the outfit, styling and mood of the second reference image");
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
