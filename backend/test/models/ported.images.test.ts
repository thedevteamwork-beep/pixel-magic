import { describe, expect, it } from "vitest";
import { DEFAULT_TIERED_CREDIT_MAPPING } from "../../src/credits/defaultTieredCreditMapping.js";
import { priceTier } from "../../src/credits/tieredCredits.js";
import type { ModelDefinition } from "../../src/models/types.js";
import {
  flux2ProGenerate,
  flux2ProImageSize,
} from "../../src/models/plugins/flux2Pro/generate/index.js";
import {
  gpt2Generate,
  gpt2ImageSize,
} from "../../src/models/plugins/gpt2/generate/index.js";
import { grokImagineImageGenerate } from "../../src/models/plugins/grokImagineImage/generate/index.js";
import { krea2Generate } from "../../src/models/plugins/krea2/generate/index.js";
import { nanoBanana2Generate } from "../../src/models/plugins/nanoBanana2/generate/index.js";
import { qwen3Generate } from "../../src/models/plugins/qwen3/generate/index.js";
import { seedream5ProGenerate } from "../../src/models/plugins/seedream5Pro/generate/index.js";
import { FakeFal } from "../fakes/fal.js";

const WEBHOOK = "https://hook/x";
const SIGNED = ["https://signed/a.png", "https://signed/b.png"];

/** Submits a job with the model's default options plus `extra`, and returns fal's submit args. */
async function submit(
  model: ModelDefinition,
  extra: Record<string, unknown> = {},
) {
  const fal = new FakeFal();
  const { images, ...options } = extra;
  await model.requestPrediction({
    fal,
    input: {
      prompt: "a cat",
      ...model.options.parse(options),
      ...(images ? { images } : {}),
    },
    webhook: WEBHOOK,
  });
  expect(fal.calls).toHaveLength(1);
  expect(fal.calls[0]!.method).toBe("submit");
  const [endpoint, payload, webhook] = fal.calls[0]!.args;
  expect(webhook).toBe(WEBHOOK);
  return { endpoint, payload };
}

/** The facts for an option set, and the tier the default mapping picks for them. */
function bill(
  model: ModelDefinition,
  options: Record<string, unknown>,
  uploadCount: number,
) {
  const facts = model.billingInputs({
    options: model.options.parse(options),
    uploadCount,
  });
  return {
    facts,
    tier: priceTier(DEFAULT_TIERED_CREDIT_MAPPING[model.key]!, facts).tier,
  };
}

/** An enum option's values, to check every choice. */
function enumOf(model: ModelDefinition, name: string): string[] {
  const field = model.schema.input[name];
  const values = field?.type === "string" && field.enum ? [...field.enum] : [];
  expect(values.length).toBeGreaterThan(0);
  return values;
}

const MODELS: [ModelDefinition, string][] = [
  [nanoBanana2Generate, "fal-ai/nano-banana-2"],
  [gpt2Generate, "openai/gpt-image-2"],
  [seedream5ProGenerate, "bytedance/seedream"],
  [flux2ProGenerate, "fal-ai/flux-2-pro"],
  [qwen3Generate, "alibaba/qwen-image-3"],
  [grokImagineImageGenerate, "xai/grok-imagine-image"],
  [krea2Generate, "krea/v2"],
];

describe("ported image models: shared behaviour", () => {
  it.each(MODELS)("%s tracks requests by its fal app", async (model, app) => {
    const fal = new FakeFal();
    await model.checkPredictionStatus({
      fal,
      requestId: "r1",
      hasImage: false,
    });
    await model.cancelPrediction({ fal, requestId: "r1", hasImage: false });
    expect(fal.calls.map((c) => c.args)).toEqual([
      [app, "r1"],
      [app, "r1"],
    ]);
  });

  it.each(MODELS)("%s parses fal's images", (model) => {
    expect(
      model.parseOutput({
        images: [{ url: "https://fal.media/x.png", content_type: "image/png" }],
      }),
    ).toEqual({
      outputs: [{ url: "https://fal.media/x.png", mimeType: "image/png" }],
      blockedCount: 0,
    });
    expect(model.kind).toBe("image");
  });
});

describe("nanoBanana2", () => {
  const model = nanoBanana2Generate;

  it("generates from the prompt alone", async () => {
    expect(await submit(model)).toEqual({
      endpoint: "fal-ai/nano-banana-2",
      payload: {
        num_images: 1,
        prompt: "a cat",
        resolution: "1K",
        aspect_ratio: "16:9",
      },
    });
  });

  it("edits with references", async () => {
    expect(
      await submit(model, {
        images: SIGNED,
        aspect_ratio: "1:4",
        output_resolution: "0.5K",
      }),
    ).toEqual({
      endpoint: "fal-ai/nano-banana-2/edit",
      payload: {
        num_images: 1,
        prompt: "a cat",
        resolution: "0.5K",
        aspect_ratio: "1:4",
        image_urls: SIGNED,
      },
    });
  });

  it("bills on output_resolution", () => {
    expect(bill(model, { output_resolution: "4K" }, 2)).toEqual({
      facts: {
        num_images: 1,
        aspect_ratio: "16:9",
        output_resolution: "4K",
        image: true,
      },
      tier: "4K",
    });
  });
});

describe("gpt2", () => {
  const model = gpt2Generate;

  it("generates from the prompt alone", async () => {
    expect(await submit(model)).toEqual({
      endpoint: "openai/gpt-image-2",
      payload: {
        prompt: "a cat",
        image_size: { width: 1024, height: 1024 },
        quality: "high",
        num_images: 1,
        sync_mode: false,
      },
    });
  });

  it("edits with references", async () => {
    expect(
      await submit(model, {
        images: SIGNED,
        aspect_ratio: "16:9",
        output_resolution: "2K",
        quality: "low",
      }),
    ).toEqual({
      endpoint: "openai/gpt-image-2/edit",
      payload: {
        prompt: "a cat",
        image_size: { width: 2560, height: 1440 },
        quality: "low",
        num_images: 1,
        sync_mode: false,
        image_urls: SIGNED,
      },
    });
  });

  it("caps the long side at 3840 and keeps sides a multiple of 16", () => {
    expect(gpt2ImageSize("16:9", "4K")).toEqual({ width: 3840, height: 2160 });
    // Scaling lands a hair under 3840, which floors to 3824, as it does in Pixelbin.
    expect(gpt2ImageSize("21:9", "4K")).toEqual({ width: 3824, height: 1632 });
    expect(gpt2ImageSize("9:16", "1K")).toEqual({ width: 768, height: 1360 });
  });

  it("every ratio and resolution stays inside fal's limits (Pixelbin checked them per request)", () => {
    for (const ratio of enumOf(model, "aspect_ratio"))
      for (const resolution of enumOf(model, "output_resolution")) {
        const { width, height } = gpt2ImageSize(ratio, resolution);
        expect((width % 16) + (height % 16)).toBe(0);
        expect(Math.max(width, height)).toBeLessThanOrEqual(3840);
        expect(width / height).toBeGreaterThanOrEqual(1 / 3);
        expect(width / height).toBeLessThanOrEqual(3);
        expect(width * height).toBeGreaterThanOrEqual(655360);
        expect(width * height).toBeLessThanOrEqual(8294400);
      }
  });

  it("bills on resolution and quality, metering each reference", () => {
    expect(
      bill(model, { output_resolution: "4K", quality: "medium" }, 3),
    ).toEqual({
      facts: {
        num_images: 1,
        aspect_ratio: "1:1",
        output_resolution: "4K",
        quality: "medium",
        image: true,
        images: 3,
      },
      tier: "4K Medium",
    });
  });
});

describe("seedream5Pro", () => {
  const model = seedream5ProGenerate;

  it("generates from the prompt alone, letting fal size an auto ratio", async () => {
    expect(await submit(model)).toEqual({
      endpoint: "bytedance/seedream/v5/pro/text-to-image",
      payload: {
        prompt: "a cat",
        image_size: "auto_2K",
        num_images: 1,
        enable_safety_checker: true,
      },
    });
  });

  it("edits with references, sizing a fixed ratio by its pixel budget", async () => {
    expect(
      await submit(model, {
        images: SIGNED,
        aspect_ratio: "16:9",
        output_resolution: "1K",
      }),
    ).toEqual({
      endpoint: "bytedance/seedream/v5/pro/edit",
      payload: {
        prompt: "a cat",
        image_size: { width: 1366, height: 768 },
        num_images: 1,
        enable_safety_checker: true,
        image_urls: SIGNED,
      },
    });
  });

  it("bills on output_resolution", () => {
    expect(bill(model, { output_resolution: "1K" }, 0)).toEqual({
      facts: {
        num_images: 1,
        aspect_ratio: "auto",
        output_resolution: "1K",
        image: false,
      },
      tier: "1K",
    });
  });
});

describe("flux2Pro", () => {
  const model = flux2ProGenerate;

  it("generates from the prompt alone", async () => {
    expect(await submit(model)).toEqual({
      endpoint: "fal-ai/flux-2-pro",
      payload: {
        prompt: "a cat",
        image_size: { width: 1024, height: 768 },
        num_images: 1,
        enable_safety_checker: true,
        safety_tolerance: "5",
      },
    });
  });

  it("edits with its one reference", async () => {
    expect(
      await submit(model, {
        images: "https://signed/a.png",
        aspect_ratio: "9:16",
        output_resolution: "2K",
      }),
    ).toEqual({
      endpoint: "fal-ai/flux-2-pro/edit",
      payload: {
        prompt: "a cat",
        image_size: { width: 1152, height: 2048 },
        num_images: 1,
        enable_safety_checker: true,
        safety_tolerance: "5",
        image_urls: ["https://signed/a.png"],
      },
    });
  });

  it("every ratio and resolution keeps both sides within 512 to 2048 (Pixelbin checked them per request)", () => {
    for (const ratio of enumOf(model, "aspect_ratio"))
      for (const resolution of enumOf(model, "output_resolution")) {
        const { width, height } = flux2ProImageSize(ratio, resolution);
        expect(Math.min(width, height)).toBeGreaterThanOrEqual(512);
        expect(Math.max(width, height)).toBeLessThanOrEqual(2048);
      }
  });

  it("bills on output_resolution", () => {
    expect(bill(model, { output_resolution: "2K" }, 1)).toEqual({
      facts: { aspect_ratio: "4:3", output_resolution: "2K", image: true },
      tier: "2K",
    });
  });
});

describe("qwen3", () => {
  const model = qwen3Generate;

  it("generates from the prompt alone with a 1K preset", async () => {
    expect(await submit(model)).toEqual({
      endpoint: "alibaba/qwen-image-3/text-to-image",
      payload: {
        num_images: 1,
        prompt: "a cat",
        image_size: "square_hd",
        output_format: "png",
        sync_mode: false,
      },
    });
  });

  it("edits with references, sizing a 2K ratio in multiples of 32", async () => {
    expect(
      await submit(model, {
        images: SIGNED,
        aspect_ratio: "3:2",
        output_resolution: "2k",
      }),
    ).toEqual({
      endpoint: "alibaba/qwen-image-3/edit",
      payload: {
        prompt: "a cat",
        num_images: 1,
        image_size: { width: 2048, height: 1376 },
        output_format: "png",
        sync_mode: false,
        image_urls: SIGNED,
      },
    });
  });

  it("sizes a 1K ratio with no preset", async () => {
    const { payload } = await submit(model, { aspect_ratio: "9:21" });
    expect(payload).toMatchObject({ image_size: { width: 448, height: 1024 } });
  });

  it("bills on output_resolution", () => {
    expect(bill(model, { output_resolution: "2k" }, 0)).toEqual({
      facts: {
        num_images: 1,
        aspect_ratio: "1:1",
        output_resolution: "2k",
        image: false,
      },
      tier: "2k",
    });
  });
});

describe("grokImagineImage", () => {
  const model = grokImagineImageGenerate;

  it("generates from the prompt alone, sending 1:1 for auto", async () => {
    expect(await submit(model)).toEqual({
      endpoint: "xai/grok-imagine-image/v2.0/text-to-image",
      payload: {
        prompt: "a cat",
        num_images: 1,
        aspect_ratio: "1:1",
        resolution: "1k",
        output_format: "png",
        quality: "medium",
      },
    });
  });

  it("edits with references, keeping auto", async () => {
    expect(
      await submit(model, {
        images: SIGNED,
        output_resolution: "2k",
        output_format: "webp",
        quality: "low",
      }),
    ).toEqual({
      endpoint: "xai/grok-imagine-image/v2.0/edit",
      payload: {
        prompt: "a cat",
        num_images: 1,
        aspect_ratio: "auto",
        resolution: "2k",
        output_format: "webp",
        quality: "low",
        image_urls: SIGNED,
      },
    });
  });

  it("sends a fixed ratio as is", async () => {
    const { payload } = await submit(model, { aspect_ratio: "19.5:9" });
    expect(payload).toMatchObject({ aspect_ratio: "19.5:9" });
  });

  it("bills on output_resolution", () => {
    expect(bill(model, { output_resolution: "2k" }, 1)).toEqual({
      facts: {
        num_images: 1,
        aspect_ratio: "auto",
        output_resolution: "2k",
        output_format: "png",
        quality: "medium",
        image: true,
      },
      tier: "2K",
    });
  });
});

describe("krea2", () => {
  const model = krea2Generate;

  it("generates from the prompt alone on Medium", async () => {
    expect(await submit(model)).toEqual({
      endpoint: "krea/v2/medium/text-to-image",
      payload: { prompt: "a cat", aspect_ratio: "1:1", creativity: "medium" },
    });
  });

  it("guides the style with references on Large", async () => {
    expect(
      await submit(model, {
        images: SIGNED,
        model: "large",
        aspect_ratio: "2.35:1",
        creativity: "raw",
      }),
    ).toEqual({
      endpoint: "krea/v2/large/text-to-image",
      payload: {
        prompt: "a cat",
        aspect_ratio: "2.35:1",
        creativity: "raw",
        image_style_references: [
          { image_url: SIGNED[0] },
          { image_url: SIGNED[1] },
        ],
      },
    });
  });

  it("bills the model option as quality", () => {
    expect(bill(model, { model: "large" }, 0)).toEqual({
      facts: {
        model: "large",
        aspect_ratio: "1:1",
        creativity: "medium",
        image: false,
        quality: "large",
      },
      tier: "Large",
    });
  });
});

describe("image count", () => {
  // Every model fal lets ask for several images; FLUX.2 Pro and Krea 2 make one.
  const counted: ModelDefinition[] = [
    nanoBanana2Generate,
    gpt2Generate,
    seedream5ProGenerate,
    qwen3Generate,
    grokImagineImageGenerate,
  ];

  it.each(counted)(
    "%s sends the chosen count to fal, 1 to 4",
    async (model) => {
      expect((await submit(model, { num_images: 3 })).payload).toMatchObject({
        num_images: 3,
      });
      expect(model.options.safeParse({ num_images: 5 }).success).toBe(false);
      expect(model.options.parse({}).num_images).toBe(1);
    },
  );

  it.each(counted)("%s charges the price of one image for each", (model) => {
    const facts = (count: number) =>
      model.billingInputs({
        options: model.options.parse({ num_images: count }),
        uploadCount: 0,
      });
    expect(model.priceMultiplier(facts(1))).toBe(1);
    expect(model.priceMultiplier(facts(4))).toBe(4);
  });

  it("leaves models priced per job, or metering images themselves, at one", () => {
    expect(
      krea2Generate.priceMultiplier(
        krea2Generate.billingInputs({
          options: krea2Generate.options.parse({}),
          uploadCount: 0,
        }),
      ),
    ).toBe(1);
    expect(flux2ProGenerate.options.safeParse({ num_images: 2 }).success).toBe(
      false,
    );
  });
});
