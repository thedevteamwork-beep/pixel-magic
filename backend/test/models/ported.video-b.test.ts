import { describe, expect, it } from "vitest";
import type { ModelDefinition } from "../../src/models/types.js";
import { ltx2FastGenerate } from "../../src/models/plugins/ltx2Fast/generate/index.js";
import { pixverse6Generate } from "../../src/models/plugins/pixverse6/generate/index.js";
import { sora2Generate } from "../../src/models/plugins/sora2/generate/index.js";
import { wan25Generate } from "../../src/models/plugins/wan25/generate/index.js";
import { wan26Generate } from "../../src/models/plugins/wan26/generate/index.js";
import { FakeFal } from "../fakes/fal.js";

const HOOK = "https://hook/x";
const IMAGE = "https://x/start.png";

/** Submits with the model's defaults (plus `extra`) and returns fal's submit args. */
async function submit(
  model: ModelDefinition,
  extra: Record<string, unknown> = {},
) {
  const fal = new FakeFal();
  await model.requestPrediction({
    fal,
    input: { prompt: "a cat", ...model.options.parse({}), ...extra },
    webhook: HOOK,
  });
  expect(fal.calls).toHaveLength(1);
  expect(fal.calls[0]!.method).toBe("submit");
  return fal.calls[0]!.args;
}

const falVideo = {
  video: { url: "https://fal.media/v.mp4", content_type: "video/mp4" },
};
const parsedVideo = {
  outputs: [{ url: "https://fal.media/v.mp4", mimeType: "video/mp4" }],
  blockedCount: 0,
};

describe("wan25", () => {
  const model = wan25Generate;

  it("text-to-video", async () =>
    expect(await submit(model)).toEqual([
      "fal-ai/wan-25-preview/text-to-video",
      {
        prompt: "a cat",
        duration: "5",
        resolution: "1080p",
        aspect_ratio: "16:9",
      },
      HOOK,
    ]));

  it("image-to-video still sends the aspect ratio, as Pixelbin does", async () =>
    expect(await submit(model, { image: IMAGE })).toEqual([
      "fal-ai/wan-25-preview/image-to-video",
      {
        prompt: "a cat",
        duration: "5",
        resolution: "1080p",
        aspect_ratio: "16:9",
        image_url: IMAGE,
      },
      HOOK,
    ]));

  it("billing facts", () =>
    expect(
      model.billingInputs({
        options: model.options.parse({ resolution: "720p", duration: "10" }),
        uploadCount: 1,
      }),
    ).toEqual({
      resolution: "720p",
      duration: 10,
      aspect_ratio: "16:9",
      output_resolution: "720p",
      image: true,
    }));

  it("status, result and cancel use the app", async () => {
    const fal = new FakeFal();
    await model.checkPredictionStatus({ fal, requestId: "r", hasImage: true });
    await model.cancelPrediction({ fal, requestId: "r", hasImage: false });
    expect(fal.calls.map((c) => c.args[0])).toEqual([
      "fal-ai/wan-25-preview",
      "fal-ai/wan-25-preview",
    ]);
  });

  it("parseOutput", () =>
    expect(model.parseOutput(falVideo)).toEqual(parsedVideo));
});

describe("wan26", () => {
  const model = wan26Generate;

  it("text-to-video", async () =>
    expect(await submit(model)).toEqual([
      "wan/v2.6/text-to-video",
      {
        prompt: "a cat",
        duration: "5",
        resolution: "1080p",
        aspect_ratio: "16:9",
      },
      HOOK,
    ]));

  it("image-to-video", async () =>
    expect(await submit(model, { image: IMAGE })).toEqual([
      "wan/v2.6/image-to-video",
      { prompt: "a cat", duration: "5", resolution: "1080p", image_url: IMAGE },
      HOOK,
    ]));

  it("billing facts", () =>
    expect(
      model.billingInputs({
        options: model.options.parse({ resolution: "720p", duration: "15" }),
        uploadCount: 0,
      }),
    ).toEqual({
      resolution: "720p",
      duration: 15,
      aspect_ratio: "16:9",
      output_resolution: "720p",
      image: false,
    }));

  it("parseOutput", () =>
    expect(model.parseOutput(falVideo)).toEqual(parsedVideo));
});

describe("sora2", () => {
  const model = sora2Generate;

  it("text-to-video sends duration as a number", async () =>
    expect(await submit(model, { duration: "8" })).toEqual([
      "fal-ai/sora-2/text-to-video",
      {
        prompt: "a cat",
        resolution: "720p",
        aspect_ratio: "16:9",
        duration: 8,
      },
      HOOK,
    ]));

  it("image-to-video", async () =>
    expect(await submit(model, { image: IMAGE })).toEqual([
      "fal-ai/sora-2/image-to-video",
      {
        prompt: "a cat",
        resolution: "720p",
        aspect_ratio: "16:9",
        duration: 4,
        image_url: IMAGE,
      },
      HOOK,
    ]));

  it("billing facts", () =>
    expect(
      model.billingInputs({
        options: model.options.parse({ duration: "12", aspect_ratio: "9:16" }),
        uploadCount: 1,
      }),
    ).toEqual({
      resolution: "720p",
      aspect_ratio: "9:16",
      duration: 12,
      image: true,
    }));

  it("parseOutput", () =>
    expect(model.parseOutput(falVideo)).toEqual(parsedVideo));
});

describe("ltx2Fast", () => {
  const model = ltx2FastGenerate;

  it("text-to-video", async () =>
    expect(await submit(model)).toEqual([
      "fal-ai/ltx-2/text-to-video/fast",
      {
        prompt: "a cat",
        duration: 6,
        resolution: "1080p",
        aspect_ratio: "16:9",
        generate_audio: true,
      },
      HOOK,
    ]));

  it("image-to-video", async () =>
    expect(await submit(model, { image: IMAGE, audio: false })).toEqual([
      "fal-ai/ltx-2/image-to-video/fast",
      {
        prompt: "a cat",
        duration: 6,
        resolution: "1080p",
        aspect_ratio: "16:9",
        generate_audio: false,
        image_url: IMAGE,
      },
      HOOK,
    ]));

  it("billing facts", () =>
    expect(
      model.billingInputs({
        options: model.options.parse({ resolution: "2160p", duration: "20" }),
        uploadCount: 0,
      }),
    ).toEqual({
      resolution: "2160p",
      duration: 20,
      aspect_ratio: "16:9",
      audio: true,
      output_resolution: "2160p",
      image: false,
    }));

  it("parseOutput", () =>
    expect(model.parseOutput(falVideo)).toEqual(parsedVideo));
});

describe("pixverse6", () => {
  const model = pixverse6Generate;

  it("text-to-video", async () =>
    expect(await submit(model)).toEqual([
      "fal-ai/pixverse/v6/text-to-video",
      {
        prompt: "a cat",
        resolution: "720p",
        duration: 5,
        generate_audio_switch: false,
        aspect_ratio: "16:9",
      },
      HOOK,
    ]));

  it("image-to-video with a style", async () =>
    expect(
      await submit(model, { image: IMAGE, style: "anime", audio: true }),
    ).toEqual([
      "fal-ai/pixverse/v6/image-to-video",
      {
        prompt: "a cat",
        resolution: "720p",
        duration: 5,
        generate_audio_switch: true,
        style: "anime",
        image_url: IMAGE,
      },
      HOOK,
    ]));

  it("billing facts", () =>
    expect(
      model.billingInputs({
        options: model.options.parse({
          resolution: "1080p",
          duration: "8",
          audio: true,
        }),
        uploadCount: 1,
      }),
    ).toEqual({
      resolution: "1080p",
      aspect_ratio: "16:9",
      duration: 8,
      audio: true,
      output_resolution: "1080p",
      image: true,
    }));

  it("status uses the app", async () => {
    const fal = new FakeFal();
    await model.checkPredictionStatus({ fal, requestId: "r", hasImage: true });
    expect(fal.calls[0]!.args).toEqual(["fal-ai/pixverse", "r"]);
  });

  it("parseOutput", () =>
    expect(model.parseOutput(falVideo)).toEqual(parsedVideo));
});
