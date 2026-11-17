import { describe, expect, it } from "vitest";
import { hailuo23Generate as hailuo23 } from "../../src/models/plugins/hailuo23/generate/index.js";
import { klingv3Generate as klingv3 } from "../../src/models/plugins/klingv3/generate/index.js";
import { seedance2Generate as seedance2 } from "../../src/models/plugins/seedance2/generate/index.js";
import { seedance25Generate as seedance25 } from "../../src/models/plugins/seedance25/generate/index.js";
import { veo31FastGenerate as veo31Fast } from "../../src/models/plugins/veo31Fast/generate/index.js";
import type { ModelDefinition } from "../../src/models/types.js";
import { FakeFal } from "../fakes/fal.js";

const START = "https://x/start.png";

async function submitted(
  model: ModelDefinition,
  input: Record<string, unknown>,
) {
  const fal = new FakeFal();
  await model.requestPrediction({ fal, input, webhook: "https://hook" });
  return { endpoint: fal.calls[0]!.args[0], payload: fal.calls[0]!.args[1] };
}

/** status, result and cancel all go to the model's fal app, whatever it was submitted to. */
async function followUpApps(model: ModelDefinition) {
  const fal = new FakeFal();
  const ref = { fal, requestId: "req_1", hasImage: true };
  fal.results.set("req_1", { ok: true, data: {} });
  await model.checkPredictionStatus(ref);
  await model.getPredictionResult(ref);
  await model.cancelPrediction(ref);
  return fal.calls.map((c) => c.args[0]);
}

const falVideo = {
  video: { url: "https://fal.media/v.mp4", content_type: "video/mp4" },
};
const parsedVideo = {
  outputs: [{ url: "https://fal.media/v.mp4", mimeType: "video/mp4" }],
  blockedCount: 0,
};

describe("klingv3 (ported from Pixelbin)", () => {
  const defaults = { prompt: "a wave", ...klingv3.options.parse({}) };

  it("text-to-video picks the tier from the resolution and takes the aspect ratio", async () => {
    expect(await submitted(klingv3, defaults)).toEqual({
      endpoint: "fal-ai/kling-video/v3/standard/text-to-video",
      payload: {
        prompt: "a wave",
        duration: "5",
        shot_type: "customize",
        generate_audio: false,
        aspect_ratio: "16:9",
      },
    });
    expect(
      (await submitted(klingv3, { ...defaults, resolution: "1080p" })).endpoint,
    ).toBe("fal-ai/kling-video/v3/pro/text-to-video");
  });

  it("image-to-video sends the start frame and no aspect ratio", async () => {
    expect(
      await submitted(klingv3, {
        ...defaults,
        resolution: "4K",
        duration: "10",
        audio: true,
        shot_type: "intelligent",
        image: START,
      }),
    ).toEqual({
      endpoint: "fal-ai/kling-video/v3/4k/image-to-video",
      payload: {
        prompt: "a wave",
        duration: "10",
        shot_type: "intelligent",
        generate_audio: true,
        start_image_url: START,
      },
    });
  });

  it("prices on resolution, audio and seconds", () => {
    expect(
      klingv3.billingInputs({
        options: klingv3.options.parse({
          resolution: "1080p",
          audio: true,
          duration: "8",
        }),
        uploadCount: 1,
      }),
    ).toEqual({
      multi_shot: true,
      resolution: "1080p",
      shot_type: "customize",
      aspect_ratio: "16:9",
      image: true,
      output_resolution: "1080p",
      audio: true,
      duration: 8,
    });
  });

  it("uses the fal app for follow-ups and parses the video", async () => {
    expect(await followUpApps(klingv3)).toEqual(
      Array(3).fill("fal-ai/kling-video"),
    );
    expect(klingv3.parseOutput(falVideo)).toEqual(parsedVideo);
  });
});

describe("seedance2 (ported from Pixelbin's fal fallback)", () => {
  const defaults = { prompt: "a city", ...seedance2.options.parse({}) };

  it("text-to-video", async () => {
    expect(await submitted(seedance2, defaults)).toEqual({
      endpoint: "bytedance/seedance-2.0/text-to-video",
      payload: {
        prompt: "a city",
        resolution: "720p",
        aspect_ratio: "16:9",
        duration: "5",
        generate_audio: false,
      },
    });
  });

  it("image-to-video sends the start frame", async () => {
    expect(
      await submitted(seedance2, {
        ...defaults,
        resolution: "4k",
        audio: true,
        image: START,
      }),
    ).toEqual({
      endpoint: "bytedance/seedance-2.0/image-to-video",
      payload: {
        prompt: "a city",
        resolution: "4k",
        aspect_ratio: "16:9",
        duration: "5",
        generate_audio: true,
        image_url: START,
      },
    });
  });

  it("prices on resolution and seconds, never with an input video", () => {
    expect(
      seedance2.billingInputs({
        options: seedance2.options.parse({
          resolution: "1080p",
          duration: "12",
        }),
        uploadCount: 0,
      }),
    ).toEqual({
      resolution: "1080p",
      aspect_ratio: "16:9",
      audio: false,
      image: false,
      output_resolution: "1080p",
      video: false,
      duration: 12,
    });
  });

  it("uses the fal app for follow-ups and parses the video", async () => {
    expect(await followUpApps(seedance2)).toEqual(
      Array(3).fill("bytedance/seedance-2.0"),
    );
    expect(seedance2.parseOutput(falVideo)).toEqual(parsedVideo);
  });
});

describe("seedance25 (ported from Pixelbin's fal fallback)", () => {
  const defaults = { prompt: "a forest", ...seedance25.options.parse({}) };

  it("text-to-video takes the aspect ratio", async () => {
    expect(
      await submitted(seedance25, { ...defaults, aspect_ratio: "9:16" }),
    ).toEqual({
      endpoint: "bytedance/seedance-2.5/text-to-video",
      payload: {
        prompt: "a forest",
        resolution: "720p",
        aspect_ratio: "9:16",
        duration: "5",
        generate_audio: true,
      },
    });
  });

  it("image-to-video follows the start frame's shape", async () => {
    expect(
      await submitted(seedance25, {
        ...defaults,
        aspect_ratio: "9:16",
        image: START,
      }),
    ).toEqual({
      endpoint: "bytedance/seedance-2.5/image-to-video",
      payload: {
        prompt: "a forest",
        resolution: "720p",
        aspect_ratio: "auto",
        duration: "5",
        generate_audio: true,
        image_url: START,
      },
    });
  });

  it("prices on resolution and seconds, never with an input video", () => {
    expect(
      seedance25.billingInputs({
        options: seedance25.options.parse({
          resolution: "480p",
          duration: "30",
        }),
        uploadCount: 1,
      }),
    ).toEqual({
      resolution: "480p",
      aspect_ratio: "16:9",
      audio: true,
      image: true,
      output_resolution: "480p",
      video: false,
      duration: 30,
    });
  });

  it("uses the fal app for follow-ups and parses the video", async () => {
    expect(await followUpApps(seedance25)).toEqual(
      Array(3).fill("bytedance/seedance-2.5"),
    );
    expect(seedance25.parseOutput(falVideo)).toEqual(parsedVideo);
  });
});

describe("veo31Fast (ported from Pixelbin's fal fallback)", () => {
  const defaults = { prompt: "a fox", ...veo31Fast.options.parse({}) };

  it("text-to-video, with the duration in fal's seconds form", async () => {
    expect(await submitted(veo31Fast, defaults)).toEqual({
      endpoint: "fal-ai/veo3.1/fast",
      payload: {
        prompt: "a fox",
        duration: "4s",
        aspect_ratio: "16:9",
        resolution: "720p",
        generate_audio: false,
      },
    });
  });

  it("image-to-video sends the start frame", async () => {
    expect(
      await submitted(veo31Fast, {
        ...defaults,
        duration: "8",
        resolution: "1080p",
        aspect_ratio: "9:16",
        audio: true,
        image: START,
      }),
    ).toEqual({
      endpoint: "fal-ai/veo3.1/fast/image-to-video",
      payload: {
        prompt: "a fox",
        duration: "8s",
        aspect_ratio: "9:16",
        resolution: "1080p",
        generate_audio: true,
        image_url: START,
      },
    });
  });

  it("prices on audio, resolution and seconds", () => {
    expect(
      veo31Fast.billingInputs({
        options: veo31Fast.options.parse({
          audio: true,
          resolution: "1080p",
          duration: "6",
        }),
        uploadCount: 0,
      }),
    ).toEqual({
      aspect_ratio: "16:9",
      resolution: "1080p",
      image: false,
      audio: true,
      output_resolution: "1080p",
      duration: 6,
    });
  });

  it("uses the fal app for follow-ups and parses the video", async () => {
    expect(await followUpApps(veo31Fast)).toEqual(
      Array(3).fill("fal-ai/veo3.1"),
    );
    expect(veo31Fast.parseOutput(falVideo)).toEqual(parsedVideo);
  });
});

describe("hailuo23 (ported from Pixelbin)", () => {
  const defaults = { prompt: "a dancer", ...hailuo23.options.parse({}) };

  it("text-to-video sends only the prompt", async () => {
    expect(await submitted(hailuo23, defaults)).toEqual({
      endpoint: "fal-ai/minimax/hailuo-2.3/pro/text-to-video",
      payload: { prompt: "a dancer" },
    });
  });

  it("image-to-video sends the start frame", async () => {
    expect(await submitted(hailuo23, { ...defaults, image: START })).toEqual({
      endpoint: "fal-ai/minimax/hailuo-2.3/pro/image-to-video",
      payload: { prompt: "a dancer", image_url: START },
    });
  });

  it("prices on seconds", () => {
    expect(
      hailuo23.billingInputs({
        options: hailuo23.options.parse({}),
        uploadCount: 1,
      }),
    ).toEqual({
      resolution: "1080p",
      image: true,
      duration: 5,
    });
  });

  it("uses the fal app for follow-ups and parses the video", async () => {
    expect(await followUpApps(hailuo23)).toEqual(
      Array(3).fill("fal-ai/minimax"),
    );
    expect(hailuo23.parseOutput(falVideo)).toEqual(parsedVideo);
  });
});
