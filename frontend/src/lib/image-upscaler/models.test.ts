import { describe, expect, it } from "vitest";
import {
  createUpscaleSettings,
  defaultUpscaleSettings,
  getUpscaleModel,
  normalizeUpscaleSettings,
  upscaleModels,
} from "./models";
import { validateUpscaleRequest } from "./validation";

describe("upscale model selection", () => {
  it("starts with the screenshot's Topaz Standard1× controls", () => {
    expect(defaultUpscaleSettings).toEqual({
      model: "topaz",
      upscale_factor: 1,
      preset: "Standard V2",
      sharpness: 50,
      denoise: 20,
      face_enhancement: false,
    });
    expect(getUpscaleModel("topaz")?.presets[0]).toMatchObject({ value: "Standard V2", label: "Standard" });
    expect(getUpscaleModel("topaz-generative")?.premium).toBe(true);
  });

  it("clears irrelevant Topaz controls and moves to an available factor for ByteDance", () => {
    const initial = { ...defaultUpscaleSettings, upscale_factor: 8 as const };
    expect(normalizeUpscaleSettings({ ...initial, model: "bytedance" })).toEqual({
      model: "bytedance",
      upscale_factor: 2,
      preset: null,
      sharpness: null,
      denoise: null,
      face_enhancement: null,
    });
    expect(initial.sharpness).toBe(50);
  });

  it("reveals Redefine tuning then clears it and manual faces for Wonder4", () => {
    const redefining = normalizeUpscaleSettings({ ...createUpscaleSettings("topaz-generative"), preset: "Redefine" });
    expect(redefining).toMatchObject({ sharpness: 50, denoise: 20, face_enhancement: false });
    const automatic = normalizeUpscaleSettings({ ...redefining, preset: "Wonder 4" });
    expect(automatic).toMatchObject({ sharpness: null, denoise: null, face_enhancement: null });
    expect(normalizeUpscaleSettings({ ...automatic, preset: "Wonder 3" })).toMatchObject({
      sharpness: null,
      denoise: null,
      face_enhancement: false,
    });
  });

  it("never turns an out-of-range tuning value into a valid API request", () => {
    const settings = normalizeUpscaleSettings({ ...defaultUpscaleSettings, sharpness: -1 });
    expect(settings.sharpness).toBe(-1);
    expect(
      validateUpscaleRequest({ ...settings, source: { width: 16, height: 16, contentType: "image/png", size: 100 } }),
    ).toMatchObject({ ok: false });
  });

  it("keeps every advertised preset/factor coherent and never enables16×", () => {
    for (const model of upscaleModels) {
      expect(model.factors).not.toContain(16);
      for (const factor of model.factors) {
        for (const preset of model.presets.length ? model.presets.map((item) => item.value) : [null]) {
          const settings = normalizeUpscaleSettings({
            ...createUpscaleSettings(model.id),
            preset,
            upscale_factor: factor,
          });
          expect(
            validateUpscaleRequest({
              ...settings,
              source: { width: 16, height: 16, contentType: "image/png", size: 100 },
            }),
          ).toMatchObject({ ok: true });
        }
      }
    }
  });
});
