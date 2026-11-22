import { describe, expect, it } from "vitest";
import { defaultVideoSettings } from "@/components/video-generator/constants";
import {
  canRenderIn1080p,
  closestAspectRatio,
  durationLabel,
  effectiveDuration,
  estimateRenderSeconds,
  fitSettingsToModel,
  formatEta,
  formatTimecode,
  getVideoModel,
  modelsForMode,
  resolutionLabel,
} from "./settings";
import { hailuo, kling21, kling3MC, seedance, testModels } from "./testModels";

describe("video settings", () => {
  it("fits settings to a model and explains every change", () => {
    const { settings, adjustments } = fitSettingsToModel(
      {
        ...defaultVideoSettings,
        mode: "reference",
        duration: 15,
        resolution: "480p",
        aspectRatio: "21:9",
        audio: true,
      },
      hailuo,
    );
    expect(settings).toMatchObject({
      model: "hailuo23_generate",
      mode: "text",
      duration: 5,
      resolution: "1080p",
      audio: false,
    });
    // Hailuo has no aspect-ratio choice, so the ratio is kept for the next model.
    expect(settings.aspectRatio).toBe("21:9");
    expect(adjustments).toEqual(["Reference to Video → Text to Video", "15s → 5s", "480p → 1080p", "sound off"]);
    expect(fitSettingsToModel({ ...defaultVideoSettings, model: seedance.id }, seedance).adjustments).toEqual([]);
  });

  it("keeps the resolution for a model without the choice", () => {
    const { settings, adjustments } = fitSettingsToModel({ ...defaultVideoSettings, resolution: "720p" }, kling21);
    expect(settings.resolution).toBe("720p");
    expect(adjustments).toEqual([]);
  });

  it("finds models by id, falling back to the first, and by mode", () => {
    expect(getVideoModel(testModels, "kling21_generate")).toBe(kling21);
    expect(getVideoModel(testModels, "gone")).toBe(seedance);
    expect(modelsForMode(testModels, "image")).toHaveLength(3);
    expect(modelsForMode(testModels, "reference").map((model) => model.id)).toEqual([
      "seedance25_generate",
      "klingO3Ref_generate",
    ]);
    expect(modelsForMode(testModels, "motion").map((model) => model.id)).toEqual(["kling3MC_generate"]);
  });

  it("follows the motion clip’s length within the model’s range", () => {
    const motion = { ...defaultVideoSettings, mode: "motion" as const, duration: 5 };
    expect(effectiveDuration(motion, { duration: 8.4 }, kling21)).toBe(10);
    expect(effectiveDuration(motion, null, kling21)).toBe(5);
    expect(effectiveDuration({ ...motion, mode: "image" }, { duration: 8.4 }, kling21)).toBe(5);
    // Motion control's own model has no length: the video is as long as the clip.
    expect(effectiveDuration(motion, { duration: 4.2 }, kling3MC)).toBe(4);
  });

  it("estimates render time, longer for bigger frames", () => {
    expect(estimateRenderSeconds(seedance, { resolution: "720p", duration: 5 })).toBe(45);
    expect(estimateRenderSeconds(seedance, { resolution: "1080p", duration: 5 })).toBe(60);
    expect(estimateRenderSeconds(kling21, { resolution: "", duration: 5 })).toBe(60);
  });

  it("offers a 1080p render only when it is bigger and the model has it", () => {
    expect(canRenderIn1080p({ resolution: "720p" }, hailuo)).toBe(true);
    expect(canRenderIn1080p({ resolution: "1080p" }, hailuo)).toBe(false);
    expect(canRenderIn1080p({ resolution: "480p" }, seedance)).toBe(false);
    expect(canRenderIn1080p({ resolution: "720p" }, undefined)).toBe(false);
  });

  it("formats times and capability labels for people", () => {
    expect(formatEta(24)).toBe("~25s");
    expect(formatEta(95)).toBe("~1.5 min");
    expect(formatTimecode(65.7)).toBe("1:05");
    expect(formatTimecode(Number.NaN)).toBe("0:00");
    expect(durationLabel(seedance)).toBe("4s–30s");
    expect(durationLabel(kling21)).toBe("5s · 10s");
    expect(resolutionLabel(seedance)).toBe("480p–720p");
    expect(resolutionLabel(kling21)).toBe("Auto");
  });

  it("matches an image to the closest supported aspect ratio", () => {
    expect(closestAspectRatio(1920, 1080, ["16:9", "9:16", "1:1"])).toBe("16:9");
    expect(closestAspectRatio(1080, 1350, ["16:9", "9:16", "1:1", "3:4"])).toBe("3:4");
    expect(closestAspectRatio(2560, 1080, ["16:9", "21:9"])).toBe("21:9");
  });
});
