import { describe, expect, it } from "vitest";
import { defaultTraits } from "@/components/ai-influencer/constants";
import { isSampleProject, samplePortrait, sampleProject, sampleProjects } from "./samples";

const HUMAN_TEMPLATES = ["fashion", "fitness", "travel", "beauty", "streetwear", "luxury"].map(
  (id) => `/_next/static/media/${id}.jpg`,
);

describe("samplePortrait", () => {
  it("uses the template's picture for an influencer made from a template", () => {
    expect(samplePortrait(defaultTraits, "fitness", "4:5").url).toBe("/_next/static/media/fitness.jpg");
  });

  it("uses the character's picture for an animal character", () => {
    expect(samplePortrait({ ...defaultTraits, character: "kitty" }, null, "4:5").url).toBe(
      "/_next/static/media/kitty.jpg",
    );
  });

  it("picks the same human template for the same traits", () => {
    const traits = { ...defaultTraits, name: "Mira", hairColor: "black" };
    const first = samplePortrait(traits, null, "4:5").url;
    expect(samplePortrait(traits, null, "9:16").url).toBe(first);
    expect(HUMAN_TEMPLATES).toContain(first);
  });

  it("is marked as a sample, in the picked shape, with a readable description", () => {
    const portrait = samplePortrait({ ...defaultTraits, name: "Mira" }, null, "9:16");
    expect(portrait).toMatchObject({ sample: true, aspectRatio: "9:16", alt: "Mira sample portrait" });
    expect(portrait.id).toMatch(/^sample-/);
  });
});

describe("sample History", () => {
  it("starts with one saved influencer per template, newest first", () => {
    const projects = sampleProjects();
    expect(projects).toHaveLength(12);
    expect(projects[0]).toMatchObject({
      projectId: "sample-fashion",
      type: "ai-influencer",
      title: "Fashion muse",
      data: { archetypeId: "fashion", aspectRatio: "4:5" },
    });
    expect(projects[0].cover?.url).toBe("/_next/static/media/fashion.jpg");
    const times = projects.map((project) => Date.parse(project.updatedAt));
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });

  it("saves a sample Generate as an influencer with its portrait as the cover", () => {
    const traits = { ...defaultTraits, name: "Mira", hairColor: "black" };
    const portrait = samplePortrait(traits, null, "9:16");
    const project = sampleProject("sample-mira", traits, null, portrait);
    expect(project).toMatchObject({
      projectId: "sample-mira",
      title: "Mira",
      data: { traits: { hairColor: "black", gender: "woman", age: "late-20s" }, aspectRatio: "9:16" },
    });
    expect(project.cover?.url).toBe(portrait.url);
  });

  it("tells sample influencers from saved ones", () => {
    expect(isSampleProject("sample-fashion")).toBe(true);
    expect(isSampleProject("6f1c2c8e-6c3b-4b8e-9a51-0d6f1b7a2c11")).toBe(false);
  });
});

describe("sample influencer without a name", () => {
  it("is titled from its look", () => {
    const portrait = samplePortrait(defaultTraits, null, "4:5");
    expect(sampleProject("sample-1", defaultTraits, null, portrait).title).toBe("Woman, late 20s");
    expect(portrait.alt).toBe("Woman, late 20s sample portrait");
  });
});
