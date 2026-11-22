import { describe, expect, it } from "vitest";
import { DEFAULT_TIERED_CREDIT_MAPPING } from "../../src/credits/defaultTieredCreditMapping.js";
import { priceTier } from "../../src/credits/tieredCredits.js";
import { kling25Generate as kling25 } from "../../src/models/plugins/kling25/generate/index.js";
import { kling3MCGenerate as kling3MC } from "../../src/models/plugins/kling3MC/generate/index.js";
import { klingO3RefGenerate as klingO3Ref } from "../../src/models/plugins/klingO3Ref/generate/index.js";
import { klingv3Generate as klingv3 } from "../../src/models/plugins/klingv3/generate/index.js";
import { seedance2Generate as seedance2 } from "../../src/models/plugins/seedance2/generate/index.js";
import { seedance25Generate as seedance25 } from "../../src/models/plugins/seedance25/generate/index.js";
import { veo31FastGenerate as veo31Fast } from "../../src/models/plugins/veo31Fast/generate/index.js";
import type { ModelDefinition } from "../../src/models/types.js";
import { FakeFal } from "../fakes/fal.js";

const START = "https://x/start.png";
const END = "https://x/end.png";
const REFS = ["https://x/a.png", "https://x/b.png"];
const CLIP = "https://x/dance.mp4";

async function submitted(
  model: ModelDefinition,
  input: Record<string, unknown>,
) {
  const fal = new FakeFal();
  await model.requestPrediction({
    fal,
    input: { ...model.options.parse({}), ...input },
    webhook: "https://hook",
  });
  return {
    endpoint: fal.calls[0]!.args[0] as string,
    payload: fal.calls[0]!.args[1] as Record<string, unknown>,
  };
}

describe("end frames", () => {
  it.each([
    [seedance25, "end_image_url"],
    [seedance2, "end_image_url"],
    [kling25, "tail_image_url"],
    [klingv3, "end_image_url"],
  ] as const)(
    "%s sends the end frame with the start frame",
    async (model, field) => {
      const { payload } = await submitted(model, {
        prompt: "a wave",
        image: START,
        end_image: END,
      });
      expect(payload[field]).toBe(END);
      expect(model.uploads.map((rule) => rule.field)).toEqual(
        expect.arrayContaining(["image", "end_image"]),
      );
    },
  );

  it("switches Veo to first-last-frame with both frames", async () => {
    expect(
      await submitted(veo31Fast, {
        prompt: "a wave",
        image: START,
        end_image: END,
      }),
    ).toMatchObject({
      endpoint: "fal-ai/veo3.1/fast/first-last-frame-to-video",
      payload: { first_frame_url: START, last_frame_url: END },
    });
    expect(
      (await submitted(veo31Fast, { prompt: "a wave", image: START })).endpoint,
    ).toBe("fal-ai/veo3.1/fast/image-to-video");
  });

  it("ignores an end frame without a start frame", async () => {
    const { payload } = await submitted(klingv3, {
      prompt: "a wave",
      end_image: END,
    });
    expect(payload.end_image_url).toBeUndefined();
  });
});

describe("reference to video", () => {
  it("sends Seedance 2.5's references to reference-to-video", async () => {
    expect(
      await submitted(seedance25, {
        prompt: "@Image1 walks",
        reference_images: REFS,
      }),
    ).toMatchObject({
      endpoint: "bytedance/seedance-2.5/reference-to-video",
      payload: { image_urls: REFS, aspect_ratio: "16:9" },
    });
  });

  it("needs at least one reference for Kling O3, picks the tier from the resolution", async () => {
    expect(
      klingO3Ref.input.safeParse({ prompt: "x", reference_images: [] }).success,
    ).toBe(false);
    expect(
      await submitted(klingO3Ref, {
        prompt: "@Image1 walks",
        reference_images: REFS,
        resolution: "720p",
      }),
    ).toEqual({
      endpoint: "fal-ai/kling-video/o3/standard/reference-to-video",
      payload: {
        prompt: "@Image1 walks",
        image_urls: REFS,
        duration: "5",
        aspect_ratio: "16:9",
        generate_audio: false,
        shot_type: "customize",
      },
    });
  });

  it("prices Kling O3 per second by resolution and sound, as Pixelbin does", () => {
    const price = (options: Record<string, unknown>) => {
      const facts = klingO3Ref.billingInputs({
        options: klingO3Ref.options.parse(options),
        uploadCount: 2,
      });
      return priceTier(
        DEFAULT_TIERED_CREDIT_MAPPING.klingO3Ref_generate!,
        facts,
      ).total;
    };
    expect(price({ resolution: "1080p", duration: "5" })).toBe(40);
    expect(price({ resolution: "1080p", duration: "5", audio: true })).toBe(50);
    expect(price({ resolution: "720p", duration: "10" })).toBe(60);
    expect(price({ resolution: "2160p", duration: "3" })).toBe(90);
  });
});

describe("motion control", () => {
  it("needs a character image and an MP4 or MOV clip", () => {
    expect(
      kling3MC.uploads.map((rule) => [rule.field, rule.kind, rule.min]),
    ).toEqual([
      ["image", "image", 1],
      ["video", "video", 1],
    ]);
    expect(kling3MC.uploads[1]!.supportedContentTypes).toEqual([
      "video/mp4",
      "video/quicktime",
    ]);
    expect(kling3MC.pricedByVideoLength).toBe(true);
  });

  it("follows the clip's orientation and keeps its sound when asked", async () => {
    expect(
      await submitted(kling3MC, { image: START, video: CLIP, audio: true }),
    ).toEqual({
      endpoint: "fal-ai/kling-video/v3/pro/motion-control",
      payload: {
        image_url: START,
        video_url: CLIP,
        keep_original_sound: true,
        character_orientation: "video",
      },
    });
  });

  it("is priced per second of the clip, rounded up", () => {
    const facts = kling3MC.billingInputs({
      options: kling3MC.options.parse({}),
      uploadCount: 2,
      videoSeconds: 8.4,
    });
    expect(
      priceTier(DEFAULT_TIERED_CREDIT_MAPPING.kling3MC_generate!, facts).total,
    ).toBe(99);
  });
});
