import { describe, expect, it } from "vitest";
import { DEFAULT_TIERED_CREDIT_MAPPING } from "../../src/credits/defaultTieredCreditMapping.js";
import { priceTier } from "../../src/credits/tieredCredits.js";
import type { ImageSize } from "../../src/lib/imageSize.js";
import { ideogramUpscale } from "../../src/models/plugins/ideogram/upscale/index.js";
import { recraftCreativeUpscale } from "../../src/models/plugins/recraftCreative/upscale/index.js";
import { recraftCrispUpscale } from "../../src/models/plugins/recraftCrisp/upscale/index.js";
import { seedvrUpscale } from "../../src/models/plugins/seedvr/upscale/index.js";
import { topazUpscale } from "../../src/models/plugins/topaz/upscale/index.js";
import type { ModelDefinition } from "../../src/models/types.js";
import { FakeFal } from "../fakes/fal.js";

const WEBHOOK = "https://hook/x";
const IMAGE = "https://signed/photo.png";
const UPLOAD_ID = "00000000-0000-4000-8000-000000000001";

/** Submits with the model's default options plus `options`; returns fal's submit args. */
async function submit(
  model: ModelDefinition,
  options: Record<string, unknown> = {},
) {
  const fal = new FakeFal();
  await model.requestPrediction({
    fal,
    // A job's validated input, with its upload id swapped for the signed URL.
    input: {
      ...model.input.parse({ ...options, image: [UPLOAD_ID] }),
      image: IMAGE,
    },
    webhook: WEBHOOK,
  });
  const [endpoint, payload, webhook] = fal.calls[0]!.args;
  expect(webhook).toBe(WEBHOOK);
  return { endpoint, payload };
}

/** The credits the default mapping charges for these options and input size. */
function credits(
  model: ModelDefinition,
  options: Record<string, unknown>,
  imageSize?: ImageSize,
) {
  const facts = model.billingInputs({
    options: model.options.parse(options),
    uploadCount: 1,
    imageSize,
  });
  return priceTier(DEFAULT_TIERED_CREDIT_MAPPING[model.key]!, facts).total;
}

const MODELS: [ModelDefinition, string, string][] = [
  [topazUpscale, "fal-ai/topaz/upscale/image", "fal-ai/topaz"],
  [seedvrUpscale, "fal-ai/seedvr/upscale/image", "fal-ai/seedvr"],
  [recraftCrispUpscale, "fal-ai/recraft/upscale/crisp", "fal-ai/recraft"],
  [recraftCreativeUpscale, "fal-ai/recraft/upscale/creative", "fal-ai/recraft"],
  [ideogramUpscale, "fal-ai/ideogram/upscale", "fal-ai/ideogram"],
];

describe("upscale models: shared behaviour", () => {
  it.each(MODELS)("%s is an upscaler that needs exactly one image", (model) => {
    expect(model.kind).toBe("upscale");
    expect(model.operation).toBe("upscale");
    expect(model.uploads).toMatchObject({ field: "image", min: 1, max: 1 });
    expect(model.input.safeParse({ image: [] }).success).toBe(false);
  });

  it.each(MODELS)(
    "%s submits to its endpoint and checks status through its app",
    async (model, endpoint, app) => {
      expect((await submit(model)).endpoint).toBe(endpoint);
      const fal = new FakeFal();
      await model.checkPredictionStatus({
        fal,
        requestId: "r1",
        hasImage: true,
      });
      expect(fal.calls[0]!.args).toEqual([app, "r1"]);
    },
  );
});

describe("Topaz upscale", () => {
  it("sends fal's field names with the chosen settings", async () => {
    const { payload } = await submit(topazUpscale, {
      model: "Wonder 3",
      upscale_factor: 4,
      face_enhancement: false,
    });
    expect(payload).toEqual({
      image_url: IMAGE,
      model: "Wonder 3",
      upscale_factor: 4,
      face_enhancement: false,
      subject_detection: "All",
      crop_to_fill: false,
      output_format: "png",
    });
  });

  it("reads fal's single image", () => {
    expect(
      topazUpscale.parseOutput({
        image: { url: "https://fal.media/up.png", content_type: "image/png" },
      }),
    ).toEqual({
      outputs: [{ url: "https://fal.media/up.png", mimeType: "image/png" }],
      blockedCount: 0,
    });
  });

  it.each([
    [{ width: 1024, height: 1024 }, 2, 5], // 4.2 MP
    [{ width: 3000, height: 2000 }, 2, 5], // 24 MP: the base tier includes 24
    [{ width: 2000, height: 2000 }, 3, 10], // 36 MP
    [{ width: 3000, height: 2000 }, 3, 20], // 54 MP
    [{ width: 3000, height: 2000 }, 4, 20], // 96 MP
    [{ width: 6000, height: 4000 }, 4, 85], // 384 MP
  ])(
    "prices %o at %i× by the result's megapixels",
    (size, factor, expected) => {
      expect(credits(topazUpscale, { upscale_factor: factor }, size)).toBe(
        expected,
      );
    },
  );
});

describe("SeedVR upscale", () => {
  it("sends fal's field names", async () => {
    const { payload } = await submit(seedvrUpscale, {
      upscale_mode: "target",
      target_resolution: "2160p",
    });
    expect(payload).toEqual({
      image_url: IMAGE,
      upscale_mode: "target",
      upscale_factor: 2,
      target_resolution: "2160p",
      output_format: "png",
    });
  });

  it("prices factor mode by the factor and target mode by the target", () => {
    const photo = { width: 4000, height: 3000 }; // 12 MP
    expect(credits(seedvrUpscale, { upscale_factor: 2 }, photo)).toBe(10); // 48 MP: over 24, not over 48
    expect(credits(seedvrUpscale, { upscale_factor: 3 }, photo)).toBe(100); // 108 MP: over 96
    // 2160p on a 3000px short side shrinks the scale below 1.
    expect(
      credits(
        seedvrUpscale,
        { upscale_mode: "target", target_resolution: "2160p" },
        photo,
      ),
    ).toBe(5);
    const small = { width: 800, height: 600 };
    // 2160p from a 600px short side: 3.6× each way, about 6.2 MP.
    expect(
      credits(
        seedvrUpscale,
        { upscale_mode: "target", target_resolution: "2160p" },
        small,
      ),
    ).toBe(5);
  });
});

describe("Recraft and Ideogram upscale", () => {
  it("send only the image to Recraft, with its safety checker off as in Pixelbin", async () => {
    expect((await submit(recraftCrispUpscale)).payload).toEqual({
      image_url: IMAGE,
      enable_safety_checker: false,
    });
    expect((await submit(recraftCreativeUpscale)).payload).toEqual({
      image_url: IMAGE,
      enable_safety_checker: false,
    });
  });

  it("sends Ideogram its prompt and dials", async () => {
    const { payload } = await submit(ideogramUpscale, {
      prompt: "crisp fabric",
      detail: 80,
      resemblance: 30,
    });
    expect(payload).toEqual({
      image_url: IMAGE,
      prompt: "crisp fabric",
      detail: 80,
      resemblance: 30,
      enable_prompt_expansion: false,
    });
  });

  it("reads Ideogram's image list", () => {
    expect(
      ideogramUpscale.parseOutput({
        images: [{ url: "https://fal.media/i.png" }],
        seed: 3,
      }).outputs,
    ).toEqual([{ url: "https://fal.media/i.png", mimeType: "image/png" }]);
  });

  it("prices each at a flat rate, whatever the options", () => {
    expect(credits(recraftCrispUpscale, {})).toBe(1);
    expect(credits(recraftCreativeUpscale, {})).toBe(13);
    expect(credits(ideogramUpscale, { detail: 100, resemblance: 1 })).toBe(3);
  });
});
