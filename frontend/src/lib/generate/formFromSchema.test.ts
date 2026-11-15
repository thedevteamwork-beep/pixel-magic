import { describe, expect, it } from "vitest";
import { buildOptions, defaultOptions, imageField, imageFieldName, optionFields } from "@/lib/generate/formFromSchema";
import { fluxSchnell, kling21 } from "@/lib/generate/fixtures";

describe("defaultOptions", () => {
  it("uses each option's default", () => {
    expect(defaultOptions(kling21)).toEqual({ duration: "5", aspect_ratio: "16:9" });
    expect(defaultOptions(fluxSchnell)).toEqual({ image_size: "landscape_4_3", num_images: 1 });
  });
});

describe("optionFields", () => {
  it("skips the prompt and the image", () => {
    const names = optionFields(kling21).map(([name]) => name);
    expect(names).toEqual(["duration", "aspect_ratio"]);
  });
});

describe("imageField", () => {
  it("finds the image field, or nothing", () => {
    expect(imageField(kling21)?.supportedContentTypes).toContain("image/png");
    expect(imageField(fluxSchnell)).toBeUndefined();
  });
});

describe("imageFieldName", () => {
  it("names the image field, or nothing", () => {
    expect(imageFieldName(kling21)).toBe("image");
    expect(imageFieldName(fluxSchnell)).toBeUndefined();
  });
});

describe("buildOptions", () => {
  it("keeps only declared option keys", () => {
    const values = { duration: "10", durations: "5", prompt: "x" };
    expect(buildOptions(kling21, values)).toEqual({ duration: "10", aspect_ratio: "16:9" });
  });

  it("turns integers into numbers", () => {
    expect(buildOptions(fluxSchnell, { num_images: "3" }).num_images).toBe(3);
  });

  it("drops empty strings for fields without a default", () => {
    const model = {
      ...fluxSchnell,
      input: { ...fluxSchnell.input, style: { type: "string" as const, description: "Style" } },
    };
    expect(buildOptions(model, { style: "" })).not.toHaveProperty("style");
    expect(buildOptions(model, { style: "neon" }).style).toBe("neon");
  });
});
