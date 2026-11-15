import { describe, expect, it } from "vitest";
import { defaultVideoSettings, videoModels } from "@/components/video-generator/constants";
import {
  closestAspectRatio,
  durationLabel,
  effectiveDuration,
  estimateCredits,
  estimateRenderSeconds,
  fitSettingsToModel,
  formatEta,
  formatTimecode,
  getVideoModel,
  modelsForMode,
  previewRenderMs,
  resolutionLabel,
} from "./settings";

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
      getVideoModel("hailuo_02"),
    );
    expect(settings).toMatchObject({
      model: "hailuo_02",
      mode: "text",
      duration: 10,
      resolution: "480p",
      aspectRatio: "16:9",
      audio: false,
    });
    expect(adjustments).toEqual(["Reference to Video → Text to Video", "15s → 10s", "21:9 → 16:9", "sound off"]);
    expect(fitSettingsToModel(defaultVideoSettings).adjustments).toEqual([]);
  });

  it("lists only models that support a mode, and every mode has one", () => {
    expect(modelsForMode("motion").map((model) => model.id)).toEqual(["kling_2_1", "wan_2_5"]);
    for (const mode of ["text", "image", "reference", "motion"] as const)
      expect(modelsForMode(mode).length).toBeGreaterThan(0);
    for (const model of videoModels) {
      expect(model.durations).toEqual([...model.durations].sort((a, b) => a - b));
      if (model.modes.includes("reference")) expect(model.maxReferences).toBeGreaterThan(0);
    }
  });

  it("follows the motion clip’s length within the model’s range", () => {
    const motion = { ...defaultVideoSettings, model: "kling_2_1", mode: "motion" as const, duration: 5 };
    expect(effectiveDuration(motion, { duration: 8.4 })).toBe(10);
    expect(effectiveDuration(motion, null)).toBe(5);
    expect(effectiveDuration({ ...motion, mode: "image" }, { duration: 8.4 })).toBe(5);
  });

  it("estimates credits per clip, with sound adding a quarter", () => {
    expect(estimateCredits({ model: "seedance_2_5", resolution: "720p", duration: 5, count: 1, audio: false })).toBe(
      40,
    );
    expect(estimateCredits({ model: "seedance_2_5", resolution: "720p", duration: 5, count: 2, audio: true })).toBe(
      100,
    );
    expect(estimateCredits({ model: "kling_2_1", resolution: "1080p", duration: 10, count: 1, audio: true })).toBe(200);
  });

  it("estimates render time and compresses it for the preview", () => {
    expect(estimateRenderSeconds({ model: "wan_2_5", resolution: "480p", duration: 5 })).toBe(24);
    expect(previewRenderMs({ model: "wan_2_5", resolution: "480p", duration: 5 })).toBe(3500);
    expect(previewRenderMs({ model: "kling_2_1", resolution: "1080p", duration: 10 })).toBe(9000);
  });

  it("formats times and capability labels for people", () => {
    expect(formatEta(24)).toBe("~25s");
    expect(formatEta(95)).toBe("~1.5 min");
    expect(formatTimecode(65.7)).toBe("1:05");
    expect(formatTimecode(Number.NaN)).toBe("0:00");
    expect(durationLabel(getVideoModel("seedance_2_5"))).toBe("4s–30s");
    expect(durationLabel(getVideoModel("veo_3_1"))).toBe("4s · 6s · 8s");
    expect(resolutionLabel(getVideoModel("seedance_2_5_flash"))).toBe("480p–720p");
  });

  it("matches an image to the closest supported aspect ratio", () => {
    expect(closestAspectRatio(1920, 1080, ["16:9", "9:16", "1:1"])).toBe("16:9");
    expect(closestAspectRatio(1080, 1350, ["16:9", "9:16", "1:1", "3:4"])).toBe("3:4");
    expect(closestAspectRatio(2560, 1080, ["16:9", "21:9"])).toBe("21:9");
  });
});
