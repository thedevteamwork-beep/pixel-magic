import { describe, expect, it } from "vitest";
import { composeImageGuidance, composeImagePrompt, defaultCreativeGuidance, rebindReferenceMentions } from "./guidance";

describe("creative guidance composition", () => {
  it("leaves a plain brief free of additional instructions", () => {
    expect(composeImageGuidance("None", defaultCreativeGuidance, [])).toBe("");
    expect(composeImagePrompt("  A red bottle  ", "")).toBe("A red bottle");
  });

  it("uses ordered image numbers and distinguishes subject from style", () => {
    const additions = composeImageGuidance("None", defaultCreativeGuidance, [{ role: "style" }, { role: "subject" }, {}]);
    expect(additions).toContain("Use image 1 as a visual style reference");
    expect(additions).toContain("Use image 2 as a subject reference");
    expect(additions).toContain("Use image 3 as a subject reference");
    expect(additions).not.toContain("image 4");
  });

  it("compiles selected style, light and palette with the user's brief taking precedence", () => {
    const additions = composeImageGuidance("Product", { lighting: "golden-hour", palette: "warm" }, []);
    const composed = composeImagePrompt("A blue perfume bottle", additions);
    expect(composed.startsWith("A blue perfume bottle\n\n")).toBe(true);
    expect(composed).toContain("commercial product photography");
    expect(composed).toContain("golden-hour light");
    expect(composed).toContain("cream, terracotta");
    expect(composed).toContain("follow the brief");
  });

  it("does not serialize unknown values, filenames or image URLs", () => {
    expect(composeImageGuidance("untrusted-style", { lighting: "untrusted-light", palette: "untrusted-color" }, [])).toBe("");
    const additions = composeImageGuidance("None", defaultCreativeGuidance, [{ role: "subject" }]);
    expect(additions).not.toMatch(/blob:|https?:|data:/);
  });

  it("removes unselected guidance rather than appending stale preset instructions", () => {
    expect(composeImageGuidance("Analog", defaultCreativeGuidance, [])).toContain("subtle film grain");
    expect(composeImageGuidance("None", { lighting: "studio", palette: "none" }, [])).not.toContain("film grain");
    expect(composeImageGuidance("None", defaultCreativeGuidance, [])).toBe("");
  });

  it("translates local reference mentions into readable request instructions", () => {
    expect(composeImagePrompt("Place @image1 beside @image2", "")).toBe("Place image 1 beside image 2");
  });

  it("rebinds mentions to their original image IDs after references are reordered", () => {
    expect(rebindReferenceMentions("Place @image1 beside @image2", ["bottle", "orange"], ["orange", "bottle"]))
      .toEqual({ prompt: "Place @image2 beside @image1", removed: false });
  });

  it("does not silently bind missing references to newly attached images", () => {
    expect(rebindReferenceMentions("Restyle @image1 using @image2", ["bottle", "style"], ["unrelated", "style"]))
      .toEqual({ prompt: "Restyle  using @image2", removed: true });
  });

  it("clears unresolved mentions when their original reference set is unavailable", () => {
    expect(rebindReferenceMentions("Edit @image1", [], ["unrelated"]))
      .toEqual({ prompt: "Edit ", removed: true });
  });
});
