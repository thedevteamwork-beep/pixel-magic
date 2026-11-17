import { describe, expect, it } from "vitest";
import { kling25Generate as kling25 } from "../../src/models/plugins/kling25/generate/index.js";
import { nanoBananaProGenerate as nanoBananaPro } from "../../src/models/plugins/nanoBananaPro/generate/index.js";
import { FakeFal } from "../fakes/fal.js";

async function submitted(
  model: typeof kling25,
  input: Record<string, unknown>,
) {
  const fal = new FakeFal();
  await model.requestPrediction({ fal, input, webhook: "https://hook" });
  return { endpoint: fal.calls[0]!.args[0], payload: fal.calls[0]!.args[1] };
}

describe("nanoBananaPro (ported from Pixelbin)", () => {
  const defaults = { prompt: "a vase", ...nanoBananaPro.options.parse({}) };

  it("generates from text, sending 1:1 for auto", async () => {
    expect(await submitted(nanoBananaPro, defaults)).toEqual({
      endpoint: "fal-ai/nano-banana-pro",
      payload: { prompt: "a vase", resolution: "1K", aspect_ratio: "1:1" },
    });
  });

  it("edits when there are references, sending every one", async () => {
    const result = await submitted(nanoBananaPro, {
      ...defaults,
      aspect_ratio: "9:16",
      output_resolution: "4K",
      images: ["https://x/1.png", "https://x/2.png"],
    });
    expect(result).toEqual({
      endpoint: "fal-ai/nano-banana-pro/edit",
      payload: {
        prompt: "a vase",
        resolution: "4K",
        aspect_ratio: "9:16",
        image_urls: ["https://x/1.png", "https://x/2.png"],
      },
    });
  });

  it("prices on the output resolution", () => {
    expect(
      nanoBananaPro.billingInputs({
        options: { aspect_ratio: "1:1", output_resolution: "4K" },
        uploadCount: 1,
      }),
    ).toEqual({
      aspect_ratio: "1:1",
      output_resolution: "4K",
      image: true,
    });
  });
});

describe("kling25 (ported from Pixelbin)", () => {
  const defaults = { prompt: "a wave", ...kling25.options.parse({}) };

  it("text-to-video is always Pro and takes the aspect ratio", async () => {
    expect(
      await submitted(kling25, { ...defaults, resolution: "720p" }),
    ).toEqual({
      endpoint: "fal-ai/kling-video/v2.5-turbo/pro/text-to-video",
      payload: { prompt: "a wave", duration: "5", aspect_ratio: "16:9" },
    });
  });

  it("image-to-video picks Standard for 720p and Pro for 1080p", async () => {
    const image = "https://x/start.png";
    expect(
      await submitted(kling25, { ...defaults, image, resolution: "720p" }),
    ).toEqual({
      endpoint: "fal-ai/kling-video/v2.5-turbo/standard/image-to-video",
      payload: { prompt: "a wave", duration: "5", image_url: image },
    });
    expect((await submitted(kling25, { ...defaults, image })).endpoint).toBe(
      "fal-ai/kling-video/v2.5-turbo/pro/image-to-video",
    );
  });

  it("bills like Pixelbin: 720p only for image-to-video at 720p", () => {
    const options = {
      resolution: "720p",
      duration: "10",
      aspect_ratio: "16:9",
    };
    expect(kling25.billingInputs({ options, uploadCount: 1 })).toMatchObject({
      output_resolution: "720p",
      duration: 10,
      image: true,
    });
    expect(kling25.billingInputs({ options, uploadCount: 0 })).toMatchObject({
      output_resolution: "1080p",
      duration: 10,
      image: false,
    });
  });
});
