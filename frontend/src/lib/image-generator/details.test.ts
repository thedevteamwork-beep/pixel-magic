import { describe, expect, it } from "vitest";
import type { ImageResult } from "@/types/image-generator";
import { relativeTime } from "@/lib/relativeTime";
import { ratioValue, resultGuidance, resultSpecs } from "./details";
import { composeImageGuidance } from "./guidance";

const item: ImageResult = {
  id: "job:0",
  jobId: "job",
  url: "https://example.com/a.png",
  expiresAt: null,
  mimeType: "image/png",
  alt: "Generated image",
  prompt: "A bottle",
  guidance: "",
  model: "gpt2_generate",
  modelName: "GPT Image 2",
  aspectRatio: "3:4",
  sizeLabel: "3:4",
  options: { prompt: "A bottle", output_resolution: "2K", quality: "high", resolution: "1K" },
  creditCost: 16,
  batchSize: 2,
  createdAt: "2026-11-18T10:00:00.000Z",
  favorite: false,
};

describe("resultSpecs", () => {
  it("lists the size, the known options once each, the format and the batch", () => {
    expect(resultSpecs(item)).toEqual([
      { label: "Size", value: "3:4" },
      { label: "Resolution", value: "2K" },
      { label: "Quality", value: "High" },
      { label: "Format", value: "PNG" },
      { label: "Images", value: "2" },
    ]);
  });

  it("leaves out the image count for a single image", () => {
    const labels = resultSpecs({ ...item, batchSize: 1, options: {} }).map((spec) => spec.label);
    expect(labels).toEqual(["Size", "Format"]);
  });
});

describe("resultGuidance", () => {
  it("names the creative direction the studio added", () => {
    const guidance = composeImageGuidance("Editorial", { lighting: "golden-hour", palette: "none" }, []);
    expect(resultGuidance({ guidance })).toEqual(["Editorial", "Golden hour"]);
  });

  it("is empty without guidance", () => {
    expect(resultGuidance({ guidance: "" })).toEqual([]);
  });
});

describe("relativeTime", () => {
  const now = Date.parse("2026-11-18T10:00:00.000Z");
  it.each([
    ["2026-11-18T09:59:40.000Z", "Just now"],
    ["2026-11-18T09:55:00.000Z", "5 minutes ago"],
    ["2026-11-18T07:00:00.000Z", "3 hours ago"],
    ["2026-11-17T10:00:00.000Z", "Yesterday"],
  ])("describes %s", (iso, text) => {
    expect(relativeTime(iso, now, "en")).toBe(text);
  });
});

describe("ratioValue", () => {
  it.each([
    ["3:4", 0.75],
    ["16:9", 16 / 9],
    ["auto", 1],
    ["0:1", 1],
  ])("reads %s", (ratio, value) => {
    expect(ratioValue(ratio)).toBeCloseTo(value);
  });
});
