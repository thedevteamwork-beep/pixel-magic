import { describe, expect, it } from "vitest";
import type { PublicModel } from "@/lib/api/types";
import { fluxSchnell } from "@/lib/generate/fixtures";
import { estimateInput, imageCount, resolveOptions, shapeForRatio, shapeOption, toStudioModel } from "./models";

const flux = toStudioModel(fluxSchnell, { maker: "Black Forest Labs", symbol: "ƒ", tag: "Fast" });

/** An editing model shaped like a future backend plugin: ratios, a choice and references. */
const editor = toStudioModel({
  ...fluxSchnell,
  key: "editor_generate",
  input: {
    prompt: { type: "string", description: "", required: true, maxLength: 5000 },
    aspect_ratio: { type: "string", description: "", enum: ["1:1", "16:9", "9:16"], default: "1:1" },
    output_format: { type: "string", description: "", enum: ["png", "jpeg"], default: "png" },
    image_urls: { type: "image", description: "", required: false, maxItems: 4, supportedContentTypes: ["image/png"] },
  },
} satisfies PublicModel);

describe("studio models", () => {
  it("describes FLUX Schnell by the controls it supports", () => {
    expect(flux).toMatchObject({
      key: "fluxSchnell_generate",
      maker: "Black Forest Labs",
      promptMaxLength: 2000,
      shape: { field: "image_size", default: "landscape_4_3" },
      count: { field: "num_images", min: 1, max: 4, default: 1 },
      references: undefined,
      choices: [],
    });
    expect(flux.shape?.options.map((option) => option.label)).toEqual(["1:1 HD", "1:1", "3:4", "9:16", "4:3", "16:9"]);
  });

  it("finds ratios, extra choices and references on other models", () => {
    expect(editor.shape?.options.map((option) => option.ratio)).toEqual(["1:1", "16:9", "9:16"]);
    expect(editor.choices).toEqual([
      { field: "output_format", label: "Output format", options: ["png", "jpeg"], default: "png" },
    ]);
    expect(editor.references).toEqual({ field: "image_urls", max: 4, required: false, mimeTypes: ["image/png"] });
    expect(editor.count).toBeUndefined();
  });

  it("labels named sizes as ratios", () => {
    expect(shapeOption("portrait_16_9")).toEqual({ value: "portrait_16_9", label: "9:16", ratio: "9:16" });
    expect(shapeOption("landscape_4_3").ratio).toBe("4:3");
    expect(shapeOption("weird_size")).toEqual({ value: "weird_size", label: "Weird size", ratio: "1:1" });
  });

  it("maps a preferred ratio to the closest size, taking the model's first on a tie", () => {
    expect(shapeForRatio(flux, "3:4")).toBe("portrait_4_3");
    expect(shapeForRatio(flux, "2:3")).toBe("portrait_4_3");
    expect(shapeForRatio(flux, "21:9")).toBe("landscape_16_9");
    expect(shapeForRatio(flux, "1:1")).toBe("square_hd");
  });

  it("never matches a preferred ratio to auto, though auto can be picked", () => {
    const withAuto = toStudioModel({
      ...fluxSchnell,
      input: {
        prompt: { type: "string", description: "", required: true },
        aspect_ratio: { type: "string", description: "", enum: ["auto", "1:1", "16:9"], default: "auto" },
      },
    });
    expect(withAuto.shape?.options[0]).toEqual({ value: "auto", label: "Auto", ratio: "1:1" });
    expect(shapeForRatio(withAuto, "1:1")).toBe("1:1");
    expect(resolveOptions(withAuto, { aspect_ratio: "auto" }, "16:9")).toEqual({ aspect_ratio: "auto" });
  });

  it("resolves options to values the model accepts", () => {
    expect(resolveOptions(flux, {}, "9:16")).toEqual({ image_size: "portrait_16_9", num_images: 1 });
    expect(resolveOptions(flux, { image_size: "square_hd", num_images: 9, junk: "x" }, "9:16")).toEqual({
      image_size: "square_hd",
      num_images: 4,
    });
    expect(resolveOptions(editor, { output_format: "gif" }, "16:9")).toEqual({
      aspect_ratio: "16:9",
      output_format: "png",
    });
    expect(imageCount(flux, { num_images: 3 })).toBe(3);
    expect(imageCount(editor, {})).toBe(1);
  });

  it("builds an estimate input with a placeholder prompt and upload ids", () => {
    expect(estimateInput(flux, { image_size: "square", num_images: 2 }, 3)).toEqual({
      image_size: "square",
      num_images: 2,
      prompt: "estimate",
    });
    const input = estimateInput(editor, { aspect_ratio: "1:1", output_format: "png" }, 2);
    expect(input.image_urls).toEqual(["00000000-0000-4000-8000-000000000000", "00000000-0000-4000-8000-000000000001"]);
  });
});
