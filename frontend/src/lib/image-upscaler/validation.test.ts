import { describe, expect, it } from "vitest";
import { calculateUpscaleOutput, MAX_UPSCALE_BYTES } from "./limits";
import { createUpscaleSettings, defaultUpscaleSettings } from "./models";
import type { UpscaleRequest } from "./types";
import { validateUpscaleRequest } from "./validation";

const request: UpscaleRequest = { ...defaultUpscaleSettings, source: { width: 1024, height: 768, contentType: "image/png", size: 12_345 }, upscale_factor: 2 };

describe("upscale contract", () => {
  it("computes exact dimensions and the actual encoding MIME without mutating input", () => {
    const original = structuredClone(request);
    expect(validateUpscaleRequest(request)).toEqual({
      ok: true,
      data: request,
      output: { width: 2048, height: 1536, contentType: "image/png", format: "png" },
    });
    expect(request).toEqual(original);
  });

  it("accepts both factors at the exact pixel/edge limit and the input-byte limit", () => {
    for (const factor of [2, 4] as const) {
      const result = validateUpscaleRequest({ ...request, source: { ...request.source, width: 8192 / factor, height: 4096 / factor, size: MAX_UPSCALE_BYTES }, upscale_factor: factor });
      expect(result).toMatchObject({ ok: true, output: { width: 8192, height: 4096 } });
    }
  });

  it("distinguishes a valid source from an output too large to allocate safely", () => {
    const source = { ...request.source, width: 4096, height: 3072 };
    expect(validateUpscaleRequest({ ...request, source })).toMatchObject({ ok: false, error: { fields: { upscale_factor: expect.stringContaining("too large") } } });
    expect(() => calculateUpscaleOutput(source, 2, "png")).toThrow("too large");
  });

  it.each([
    null, [], "image", {},
    { ...request, source: null },
    { ...request, image_url: "https://outside.example/image.png" },
    { ...request, source: { ...request.source, url: "blob:local-preview" } },
    { ...request, upscale_factor: "2" },
    { ...request, upscale_factor: 3 },
    { ...request, upscale_factor: 2.5 },
    { ...request, output_format: "png" },
    { ...request, model: "unknown" },
    { ...request, upscale_factor: 16 },
    { ...request, preset: "Standard" },
    { ...request, preset: "Unknown preset" },
    { ...request, sharpness: "50" },
    { ...request, sharpness: -1 },
    { ...request, denoise: 101 },
    { ...request, denoise: Number.NaN },
    { ...request, face_enhancement: null },
  ])("rejects malformed or extra request fields: %j", (input) => {
    expect(validateUpscaleRequest(input)).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
  });

  it.each([
    { width: 0 }, { width: -1 }, { width: 100.5 }, { width: "1024" }, { height: Number.NaN },
    { width: 8193 }, { width: 8192, height: 8192 }, { contentType: "image/svg+xml" },
    { contentType: "image/jpg" }, { size: 0 }, { size: 1.5 }, { size: MAX_UPSCALE_BYTES + 1 },
  ])("rejects unsupported source metadata: %j", (patch) => {
    expect(validateUpscaleRequest({ ...request, source: { ...request.source, ...patch } })).toMatchObject({ ok: false });
  });

  it("accepts real zero-valued tuning and rejects irrelevant controls instead of dropping them", () => {
    expect(validateUpscaleRequest({ ...request, sharpness: 0, denoise: 100, face_enhancement: true })).toMatchObject({ ok: true, data: { sharpness: 0, denoise: 100, face_enhancement: true } });
    const bytedance = { ...createUpscaleSettings("bytedance"), source: request.source };
    expect(validateUpscaleRequest(bytedance)).toMatchObject({ ok: true });
    expect(validateUpscaleRequest({ ...bytedance, sharpness: 50 })).toMatchObject({ ok: false });
    expect(validateUpscaleRequest({ ...bytedance, preset: "Standard V2" })).toMatchObject({ ok: false });
    expect(validateUpscaleRequest({ ...bytedance, upscale_factor: 1 })).toMatchObject({ ok: false });
  });

  it("enforces Generative sub-preset tuning and face support", () => {
    const generative = { ...createUpscaleSettings("topaz-generative"), source: request.source };
    expect(validateUpscaleRequest(generative)).toMatchObject({ ok: true });
    expect(validateUpscaleRequest({ ...generative, sharpness: 50 })).toMatchObject({ ok: false });
    expect(validateUpscaleRequest({ ...generative, upscale_factor: 8 })).toMatchObject({ ok: false });
    expect(validateUpscaleRequest({ ...generative, preset: "Redefine" })).toMatchObject({ ok: false });
    expect(validateUpscaleRequest({ ...generative, preset: "Redefine", sharpness: 50, denoise: 20 })).toMatchObject({ ok: true });
    expect(validateUpscaleRequest({ ...generative, preset: "Wonder 4" })).toMatchObject({ ok: false });
    expect(validateUpscaleRequest({ ...generative, preset: "Wonder 4", face_enhancement: null })).toMatchObject({ ok: true });
  });
});
