import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  getModel,
  getOperation,
  listModels,
} from "../../src/models/registry.js";
import { FakeFal } from "../fakes/fal.js";
import { OutputInvalidError } from "../../src/models/types.js";

function fixture(name: string): unknown {
  return JSON.parse(
    readFileSync(
      new URL(`../fixtures/fal/${name}.json`, import.meta.url),
      "utf8",
    ),
  );
}

const flux = getOperation("fluxSchnell", "generate")!;
const kling = getOperation("kling21", "generate")!;

describe("model registry", () => {
  it("lists each operation with its plugin, operation and key", () => {
    expect(listModels().map((m) => [m.plugin, m.operation, m.key])).toEqual([
      ["fluxSchnell", "generate", "fluxSchnell_generate"],
      ["kling21", "generate", "kling21_generate"],
    ]);
  });

  it("finds an operation by plugin and operation, and a job's model by key", () => {
    expect(getOperation("kling21", "generate")?.key).toBe("kling21_generate");
    expect(getModel("kling21_generate")?.plugin).toBe("kling21");
    expect(getOperation("kling21", "nope")).toBeUndefined();
    expect(getOperation("nope", "generate")).toBeUndefined();
    expect(getModel("nope")).toBeUndefined();
  });

  it("never treats an object's built-in keys as a plugin or an operation", () => {
    expect(getOperation("constructor", "generate")).toBeUndefined();
    expect(getOperation("__proto__", "generate")).toBeUndefined();
    expect(getOperation("kling21", "constructor")).toBeUndefined();
    expect(getOperation("kling21", "hasOwnProperty")).toBeUndefined();
  });

  it("every model's options parse from an empty object", () => {
    for (const m of listModels())
      expect(() => m.options.parse({})).not.toThrow();
  });

  it("flux requestPrediction sends prompt, image_size, num_images", async () => {
    const fal = new FakeFal();
    await flux.requestPrediction({
      fal,
      input: { prompt: "a cat", ...flux.options.parse({}) },
      webhook: "https://hook/x",
    });
    expect(fal.calls).toEqual([
      {
        method: "submit",
        args: [
          "fal-ai/flux/schnell",
          {
            prompt: "a cat",
            image_size: "landscape_4_3",
            num_images: 1,
            // Always on: the safety checker is never user-controllable.
            enable_safety_checker: true,
          },
          "https://hook/x",
        ],
      },
    ]);
  });

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

  it("kling21 requestPrediction: an image goes to image-to-video with image_url and no aspect_ratio", async () => {
    const fal = new FakeFal();
    await kling.requestPrediction({
      fal,
      input: {
        prompt: "pan",
        ...kling.options.parse({}),
        image: "https://x/y.png",
      },
      webhook: "https://hook/x",
    });
    expect(fal.calls[0]?.args).toEqual([
      "fal-ai/kling-video/v2.1/master/image-to-video",
      { prompt: "pan", duration: "5", image_url: "https://x/y.png" },
      "https://hook/x",
    ]);
  });

  it("kling21 requestPrediction: no image goes to text-to-video with aspect_ratio", async () => {
    const fal = new FakeFal();
    await kling.requestPrediction({
      fal,
      input: { prompt: "pan", ...kling.options.parse({}) },
      webhook: "https://hook/x",
    });
    expect(fal.calls[0]?.args).toEqual([
      "fal-ai/kling-video/v2.1/master/text-to-video",
      { prompt: "pan", duration: "5", aspect_ratio: "16:9" },
      "https://hook/x",
    ]);
  });

  it.each([[true], [false]])(
    "kling21 status/result/cancel use the same endpoint as submit (hasImage %s)",
    async (hasImage) => {
      const fal = new FakeFal();
      fal.statuses.set("req_1", "COMPLETED");
      fal.results.set("req_1", { ok: true, data: {} });
      const { requestId } = await kling.requestPrediction({
        fal,
        input: {
          prompt: "pan",
          ...kling.options.parse({}),
          ...(hasImage ? { image: "https://x/y.png" } : {}),
        },
        webhook: "https://hook/x",
      });
      await kling.checkPredictionStatus({ fal, requestId, hasImage });
      await kling.getPredictionResult({ fal, requestId, hasImage });
      await kling.cancelPrediction({ fal, requestId, hasImage });
      expect(fal.calls.map((c) => c.method)).toEqual([
        "submit",
        "status",
        "result",
        "cancel",
      ]);
      expect(new Set(fal.calls.map((c) => c.args[0])).size).toBe(1);
    },
  );

  it("kling21 parses the video", () => {
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

  it("has no billingRange: the credit range comes from billingSamples", () => {
    expect(flux).not.toHaveProperty("billingRange");
    expect(kling).not.toHaveProperty("billingRange");
  });

  it("rejects out-of-range options", () => {
    expect(flux.options.safeParse({ num_images: 5 }).success).toBe(false);
    expect(kling.options.safeParse({ duration: "7" }).success).toBe(false);
  });
});
