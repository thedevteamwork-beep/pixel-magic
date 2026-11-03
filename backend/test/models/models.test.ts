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
const kling = getModel("kling21")!;

describe("model registry", () => {
  it("lists both models and looks them up by key", () => {
    expect(listModels().map((m) => m.key)).toEqual(["flux-schnell", "kling21"]);
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
    const options = kling.options.parse({});
    expect(kling.falEndpoint({ uploadCount: 1 })).toBe(
      "fal-ai/kling-video/v2.1/master/image-to-video",
    );
    expect(
      kling.buildInput({
        prompt: "pan",
        options,
        inputUrls: ["https://x/y.png"],
      }),
    ).toEqual({ prompt: "pan", image_url: "https://x/y.png", duration: "5" });
    expect(kling.falEndpoint({ uploadCount: 0 })).toBe(
      "fal-ai/kling-video/v2.1/master/text-to-video",
    );
    expect(kling.buildInput({ prompt: "pan", options, inputUrls: [] })).toEqual(
      { prompt: "pan", duration: "5", aspect_ratio: "16:9" },
    );
    expect(kling.parseOutput(fixture("kling21"))).toEqual({
      outputs: [
        { url: "https://fal.media/files/v.mp4", mimeType: "video/mp4" },
      ],
      blockedCount: 0,
    });
  });

  it("billing facts: options plus the unit value plus image", () => {
    expect(
      flux.billingInputs({
        options: flux.options.parse({ num_images: 3 }),
        uploadCount: 0,
      }),
    ).toEqual({
      image_size: "landscape_4_3",
      num_images: 3,
      images: 3,
      image: false,
    });
    expect(
      kling.billingInputs({
        options: kling.options.parse({ duration: "10" }),
        uploadCount: 1,
      }),
    ).toEqual({
      duration: 10,
      aspect_ratio: "16:9",
      image: true,
    });
  });

  it("billing ranges are full fact sets at the unit's extremes", () => {
    expect(flux.billingRange()).toEqual({
      min: {
        image_size: "landscape_4_3",
        num_images: 1,
        images: 1,
        image: false,
      },
      max: {
        image_size: "landscape_4_3",
        num_images: 4,
        images: 4,
        image: false,
      },
    });
    expect(kling.billingRange().min).toMatchObject({ duration: 5 });
    expect(kling.billingRange().max).toMatchObject({ duration: 10 });
  });

  it("rejects out-of-range options", () => {
    expect(flux.options.safeParse({ num_images: 5 }).success).toBe(false);
    expect(kling.options.safeParse({ duration: "7" }).success).toBe(false);
  });
});
