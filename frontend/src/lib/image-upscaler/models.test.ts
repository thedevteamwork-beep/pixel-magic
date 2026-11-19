import { describe, expect, it } from "vitest";
import type { JobView, PublicModel } from "@/lib/api/types";
import {
  defaultValues,
  factorChoices,
  formatMegapixels,
  formatScale,
  jobToUpscaleResult,
  jobValues,
  outputSize,
  scaleOf,
  toUpscaleModel,
} from "./models";

const image = {
  type: "image" as const,
  description: "The image to upscale",
  required: true,
  maxItems: 1,
  supportedContentTypes: ["image/png"],
};

// As GET /v1/models returns them.
const topazSource: PublicModel = {
  key: "topaz_upscale",
  plugin: "topaz",
  operation: "upscale",
  name: "Topaz Upscale",
  kind: "upscale",
  category: ["upscale"],
  description: "Enhance and upscale.",
  credits: { min: 5, max: 85 },
  input: {
    image,
    model: { type: "string", description: "Model", enum: ["Standard V2", "CGI"], default: "Standard V2" },
    upscale_factor: { type: "integer", description: "Factor", minimum: 1, maximum: 4, default: 2 },
    face_enhancement: { type: "boolean", description: "Faces", default: true },
    output_format: { type: "string", description: "Format", enum: ["png", "jpeg"], default: "png" },
  },
};
const seedvrSource: PublicModel = {
  ...topazSource,
  key: "seedvr_upscale",
  plugin: "seedvr",
  name: "SeedVR2 Upscale",
  input: {
    image,
    upscale_mode: { type: "string", description: "Mode", enum: ["factor", "target"], default: "factor" },
    upscale_factor: { type: "integer", description: "Factor", minimum: 1, maximum: 10, default: 2 },
    target_resolution: { type: "string", description: "Target", enum: ["720p", "1080p", "2160p"], default: "1080p" },
  },
};
const ideogramSource: PublicModel = {
  ...topazSource,
  key: "ideogram_upscale",
  plugin: "ideogram",
  name: "Ideogram Upscale",
  input: {
    image,
    prompt: { type: "string", description: "Prompt", default: "", maxLength: 1000 },
    detail: { type: "integer", description: "Detail", minimum: 1, maximum: 100, default: 50 },
  },
};

const topaz = toUpscaleModel(topazSource, { maker: "Topaz Labs", symbol: "T", bestFor: "Photos" });
const seedvr = toUpscaleModel(seedvrSource);
const ideogram = toUpscaleModel(ideogramSource);

describe("toUpscaleModel", () => {
  it("separates the scale from the other settings, which become controls", () => {
    expect(topaz.factor).toEqual({ field: "upscale_factor", min: 1, max: 4, default: 2 });
    expect(topaz.target).toBeUndefined();
    expect(topaz.controls.map((control) => [control.field, control.kind, control.label])).toEqual([
      ["model", "choice", "Model"],
      ["face_enhancement", "toggle", "Face enhancement"],
      ["output_format", "choice", "File format"],
    ]);
    expect(topaz).toMatchObject({ maker: "Topaz Labs", symbol: "T", bestFor: "Photos" });
  });

  it("recognises scaling to a target resolution", () => {
    expect(seedvr.target).toEqual({
      modeField: "upscale_mode",
      field: "target_resolution",
      options: ["720p", "1080p", "2160p"],
      default: "1080p",
    });
    expect(seedvr.controls).toEqual([]);
  });

  it("turns a prompt and an integer into a text box and a slider", () => {
    expect(ideogram.factor).toBeUndefined();
    expect(ideogram.controls.map((control) => [control.field, control.kind])).toEqual([
      ["prompt", "text"],
      ["detail", "slider"],
    ]);
  });
});

describe("scale and size", () => {
  const photo = { width: 1500, height: 1000 };

  it("offers every factor of a short range and the useful steps of a long one", () => {
    expect(factorChoices(topaz)).toEqual([1, 2, 3, 4]);
    expect(factorChoices(seedvr)).toEqual([1, 2, 4, 6, 8, 10]);
    expect(factorChoices(ideogram)).toEqual([]);
  });

  it("scales by the factor, or to the target's short side", () => {
    expect(outputSize(topaz, { upscale_factor: 4 }, photo)).toEqual({ width: 6000, height: 4000 });
    const target = { ...defaultValues(seedvr), upscale_mode: "target", target_resolution: "2160p" };
    expect(scaleOf(seedvr, target, photo)).toBeCloseTo(2.16);
    expect(outputSize(seedvr, target, photo)).toEqual({ width: 3240, height: 2160 });
  });

  it("leaves the size to a model without a scale", () => {
    expect(outputSize(ideogram, defaultValues(ideogram), photo)).toBeNull();
  });

  it("formats sizes for people", () => {
    expect(formatMegapixels({ width: 6000, height: 4000 })).toBe("24 MP");
    expect(formatMegapixels({ width: 600, height: 400 })).toBe("0.2 MP");
    expect([formatScale(4), formatScale(2.16)]).toEqual(["4×", "2.2×"]);
  });
});

describe("values", () => {
  it("defaults every setting, scaling by a factor first", () => {
    expect(defaultValues(seedvr)).toEqual({ upscale_factor: 2, upscale_mode: "factor", target_resolution: "1080p" });
    expect(defaultValues(topaz)).toEqual({
      upscale_factor: 2,
      model: "Standard V2",
      face_enhancement: true,
      output_format: "png",
    });
  });

  it("sends only the fields the model declares", () => {
    expect(jobValues(topaz, { upscale_factor: 2, prompt: "x", model: "CGI" })).toEqual({
      upscale_factor: 2,
      model: "CGI",
    });
  });
});

describe("jobToUpscaleResult", () => {
  const job: JobView = {
    jobId: "j1",
    projectId: null,
    status: "completed",
    model: "topaz_upscale",
    input: { image: ["u1"], upscale_factor: 4, model: "CGI" },
    creditCost: 20,
    createdAt: "2026-11-19T10:00:00.000Z",
    completedAt: "2026-11-19T10:00:20.000Z",
    outputs: [{ index: 0, mimeType: "image/png", url: "https://storage/up.png" }],
  };

  it("reads a completed job, keeping its settings but not its uploads", () => {
    expect(jobToUpscaleResult(job, [topaz], { width: 10, height: 10 })).toEqual({
      jobId: "j1",
      url: "https://storage/up.png",
      mimeType: "image/png",
      model: "topaz_upscale",
      modelName: "Topaz Upscale",
      values: { upscale_factor: 4, model: "CGI" },
      creditCost: 20,
      createdAt: "2026-11-19T10:00:20.000Z",
      inputSize: { width: 10, height: 10 },
    });
  });

  it("has no result for an unfinished job", () => {
    expect(jobToUpscaleResult({ ...job, status: "submitted", outputs: [] }, [topaz])).toBeNull();
  });
});
