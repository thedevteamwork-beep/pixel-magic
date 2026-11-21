import { describe, expect, it } from "vitest";
import { defaultTraits, MAX_EXTRA_LENGTH } from "@/components/ai-influencer/constants";
import { composeInfluencerPrompt, displayName, seedFrom, traitLabel, userNotesFromPrompt } from "./prompt";

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
  it("puts the sections in order", () => {
    const prompt = composeInfluencerPrompt(everyTrait, { photo: true, style: true });
    const order = [
      "You are an expert AI influencer creator",
      "## Priorities",
      "## Output",
      "## Photography",
      "## Realism details",
      "## Character",
      "## Style",
      "## Reference images",
      "## Avoid",
    ].map((heading) => prompt.indexOf(heading));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("gives user notes the highest priority", () => {
    const prompt = composeInfluencerPrompt(defaultTraits);
    expect(prompt).toContain("1. User notes: the user's own words win over everything below.");
    expect(prompt).toContain("never overridden");
  });

  it("writes a picked colour as words plus its hex", () => {
    const prompt = composeInfluencerPrompt({
      ...defaultTraits,
      skinTone: "olive",
      hairColor: "pastel",
      eyeColor: "hazel",
    });
    expect(prompt).toContain("- Skin tone: olive, medium skin with warm golden-olive undertones (#c99a6e)");
    expect(prompt).toContain("- Hair colour: pastel, dyed pastel lavender (#c7a7f0)");
    expect(prompt).toContain("- Eyes: hazel, golden brown with green flecks (#8a6a35)");
  });

  it("describes hair style, build and age", () => {
    const prompt = composeInfluencerPrompt({ ...defaultTraits, hairStyle: "long-waves", build: "athletic" });
    expect(prompt).toContain("- Hair style: long, soft, loose waves falling past the shoulders");
    expect(prompt).toContain("- Build: toned, athletic build with visible muscle definition");
    expect(prompt).toContain("- Age: late 20s (looks about 26–29)");
  });

  it("describes the outfit and setting it was given", () => {
    const prompt = composeInfluencerPrompt({ ...defaultTraits, outfit: "streetwear", setting: "café" });
    expect(prompt).toContain(
      "- Outfit: streetwear (oversized hoodie or graphic tee, wide-leg jeans or cargo pants, chunky sneakers, layered accessories)",
    );
    expect(prompt).toContain("- Setting: café (cosy café interior, wooden table, warm ambient light)");
  });

  it("leaves out traits that were not picked", () => {
    const prompt = composeInfluencerPrompt(defaultTraits);
    expect(prompt).toContain("- Character type: human");
    expect(prompt).toContain("- Gender: woman");
    for (const missing of ["Heritage", "Skin tone", "Hair style", "Hair colour", "- Eyes", "- Build", "## Style"]) {
      expect(prompt).not.toContain(missing);
    }
  });

  it("adds user notes only when there is text", () => {
    expect(composeInfluencerPrompt({ ...defaultTraits, extra: "  freckles  " })).toContain("## User notes\nfreckles\n");
    expect(composeInfluencerPrompt({ ...defaultTraits, extra: "   " })).not.toContain("## User notes");
  });

  it("lists the safety rules", () => {
    expect(composeInfluencerPrompt(defaultTraits)).toContain("anyone who looks under 18");
  });

  it("stays within Nano Banana's 5000-character prompt limit", () => {
    // The longest description of every trait, both references and the longest notes.
    const longest = {
      ...defaultTraits,
      character: "wild",
      gender: "non-binary",
      ethnicity: "southeast-asian",
      skinTone: "deep",
      hairStyle: "pixie",
      hairColor: "silver",
      eyeColor: "hazel",
      build: "athletic",
      outfit: "streetwear",
      setting: "rooftop-at-golden-hour",
      extra: "x".repeat(MAX_EXTRA_LENGTH),
    };
    expect(composeInfluencerPrompt(longest, { photo: true, style: true }).length).toBeLessThanOrEqual(5000);
  });
});

describe("character type", () => {
  it("adds the look of an expressive or wild human character", () => {
    expect(composeInfluencerPrompt({ ...defaultTraits, character: "natural" })).toContain(
      "- Character type: human, natural look",
    );
    expect(composeInfluencerPrompt({ ...defaultTraits, character: "expressive" })).toContain(
      "- Character type: human, bold, expressive features",
    );
    expect(composeInfluencerPrompt({ ...defaultTraits, character: "wild" })).toContain(
      "- Character type: human, extreme, exaggerated, eccentric look",
    );
  });

  it("describes an animal character without human-only traits", () => {
    const prompt = composeInfluencerPrompt({ ...everyTrait, character: "kitty" }, { photo: true });
    expect(prompt).toContain("- Character type: anthropomorphic cat character");
    expect(prompt).toContain("- Gender: female");
    expect(prompt).toContain("Fur or feathers");
    expect(prompt).toContain("a single character");
    expect(prompt).toContain("keep the same character identity");
    for (const human of ["Heritage", "Skin tone", "- Skin:", "makeup", "a single person"]) {
      expect(prompt).not.toContain(human);
    }
  });
});

describe("reference images", () => {
  it.each([
    [{}, [], ["## Reference images"]],
    [{ photo: true }, ["- Image 1 (face): keep the same face"], ["Image 2", "(style)"]],
    [{ style: true }, ["- Image 1 (style): match its outfit"], ["Image 2", "(face)"]],
    [{ photo: true, style: true }, ["- Image 1 (face)", "- Image 2 (style)"], []],
  ])("for %o lists the images sent", (references, present, absent) => {
    const prompt = composeInfluencerPrompt(defaultTraits, references);
    for (const text of present) expect(prompt).toContain(text);
    for (const text of absent) expect(prompt).not.toContain(text);
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

describe("userNotesFromPrompt", () => {
  it("gives back only what the user wrote", () => {
    const prompt = composeInfluencerPrompt(
      { ...defaultTraits, extra: "freckles, gold hoop earrings" },
      { photo: true },
    );
    expect(userNotesFromPrompt(prompt)).toBe("freckles, gold hoop earrings");
  });

  it("keeps notes that span several lines", () => {
    const prompt = composeInfluencerPrompt({ ...defaultTraits, extra: "freckles\nsoft smile" });
    expect(userNotesFromPrompt(prompt)).toBe("freckles\nsoft smile");
  });

  it("is empty when the user wrote nothing, or for a prompt in another format", () => {
    expect(userNotesFromPrompt(composeInfluencerPrompt(defaultTraits))).toBe("");
    expect(userNotesFromPrompt("a cat")).toBe("");
  });
});
