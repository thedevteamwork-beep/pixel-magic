import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getModel, listModels } from "../../src/models/registry.js";
import { OutputInvalidError } from "../../src/models/types.js";

function fixture(name: string): unknown {
  return JSON.parse(
    readFileSync(
      new URL(`../fixtures/fal/${name}.json`, import.meta.url),
      "utf8",
    ),
  );
}

const flux = getModel("flux-schnell")!;
const kling = getModel("kling-i2v")!;

describe("model registry", () => {
  it("lists both models and looks them up by key", () => {
    expect(listModels().map((m) => m.key)).toEqual([
      "flux-schnell",
      "kling-i2v",
    ]);
    expect(getModel("nope")).toBeUndefined();
  });

  it("every model's options parse from an empty object", () => {
    for (const m of listModels())
      expect(() => m.options.parse({})).not.toThrow();
  });

  it("flux buildInput always turns the safety checker on", () =>
    expect(
      flux.buildInput({
        prompt: "a cat",
        options: flux.options.parse({}),
        inputUrls: [],
      }),
    ).toEqual({
      prompt: "a cat",
      image_size: "landscape_4_3",
      num_images: 1,
      enable_safety_checker: true,
    }));

  it("flux parseOutput drops NSFW images", () =>
    expect(flux.parseOutput(fixture("flux-schnell"))).toEqual({
      outputs: [
        { url: "https://fal.media/files/a.jpg", mimeType: "image/jpeg" },
      ],
      blockedCount: 1,
    }));

  it("parseOutput throws OutputInvalidError on an unexpected shape", () => {
    expect(() => flux.parseOutput({ foo: 1 })).toThrow(OutputInvalidError);
    expect(() => kling.parseOutput({ foo: 1 })).toThrow(OutputInvalidError);
  });

  it("kling builds input and parses the video", () => {
    expect(
      kling.buildInput({
        prompt: "pan",
        options: kling.options.parse({}),
        inputUrls: ["https://x/y.png"],
      }),
    ).toEqual({ prompt: "pan", image_url: "https://x/y.png", duration: "5" });
    expect(kling.parseOutput(fixture("kling-i2v"))).toEqual({
      outputs: [
        { url: "https://fal.media/files/v.mp4", mimeType: "video/mp4" },
      ],
      blockedCount: 0,
    });
  });

  it("credit costs", () => {
    expect(flux.creditCost({ image_size: "square", num_images: 3 })).toBe(3);
    expect(kling.creditCost({ duration: "5" })).toBe(10);
    expect(kling.creditCost({ duration: "10" })).toBe(20);
  });

  it("rejects out-of-range options", () => {
    expect(flux.options.safeParse({ num_images: 5 }).success).toBe(false);
    expect(kling.options.safeParse({ duration: "7" }).success).toBe(false);
  });
});
