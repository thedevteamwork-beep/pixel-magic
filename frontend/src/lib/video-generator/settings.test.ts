import { describe, expect, it } from "vitest";
import { defaultVideoSettings } from "@/components/video-generator/constants";
import {
  closestAspectRatio,
  composeVideoPrompt,
  estimateCredits,
  estimateRenderSeconds,
  fitSettingsToModel,
  formatEta,
  formatTimecode,
  getVideoModel,
  previewRenderMs,
} from "./settings";

describe("video settings", () => {
  it("fits settings to a model and explains every change", () => {
    const { settings, adjustments } = fitSettingsToModel(
      { ...defaultVideoSettings, duration: 15, resolution: "480p", aspectRatio: "21:9", audio: true, mode: "frames" },
      getVideoModel("veo_3_1"),
    );
    expect(settings).toMatchObject({
      model: "veo_3_1",
      duration: 8,
      resolution: "720p",
      aspectRatio: "16:9",
      audio: true,
      mode: "image",
    });
    expect(adjustments).toEqual(["15s → 8s", "480p → 720p", "21:9 → 16:9", "end frame not supported"]);
  });

  it("turns sound off for silent models and leaves supported settings alone", () => {
    expect(fitSettingsToModel({ ...defaultVideoSettings, audio: true }, getVideoModel("kling_2_1"))).toEqual({
      settings: { ...defaultVideoSettings, model: "kling_2_1", audio: false },
      adjustments: ["sound off"],
    });
    expect(fitSettingsToModel(defaultVideoSettings).adjustments).toEqual([]);
  });

  it("estimates credits per clip, with sound adding a quarter", () => {
    expect(estimateCredits({ model: "seedance_2_5", resolution: "720p", duration: 5, count: 1, audio: false })).toBe(
      40,
    );
    expect(estimateCredits({ model: "seedance_2_5", resolution: "720p", duration: 5, count: 2, audio: true })).toBe(
      100,
    );
    // A model without sound never charges for it.
    expect(estimateCredits({ model: "kling_2_1", resolution: "1080p", duration: 10, count: 1, audio: true })).toBe(200);
  });

  it("estimates render time and compresses it for the preview", () => {
    expect(estimateRenderSeconds({ model: "wan_2_5", resolution: "480p", duration: 5 })).toBe(24);
    expect(previewRenderMs({ model: "wan_2_5", resolution: "480p", duration: 5 })).toBe(3500);
    expect(previewRenderMs({ model: "kling_2_1", resolution: "1080p", duration: 10 })).toBe(9000);
  });

  it("formats times for people", () => {
    expect(formatEta(24)).toBe("~25s");
    expect(formatEta(95)).toBe("~1.5 min");
    expect(formatEta(120)).toBe("~2 min");
    expect(formatTimecode(65.7)).toBe("1:05");
    expect(formatTimecode(Number.NaN)).toBe("0:00");
  });

  it("appends camera direction once, after the brief", () => {
    expect(composeVideoPrompt("  A red kite  ", "auto")).toBe("A red kite");
    expect(composeVideoPrompt("", "static", 10)).toBe(
      "Camera: Static locked-off camera on a tripod; only the subject moves. Keep the movement subtle.",
    );
    expect(composeVideoPrompt("A red kite", "dolly-in", 90)).toBe(
      "A red kite\n\nCamera: Slow, smooth dolly-in toward the subject. Keep the movement strong.",
    );
  });

  it("matches an image to the closest supported aspect ratio", () => {
    expect(closestAspectRatio(1920, 1080, ["16:9", "9:16", "1:1"])).toBe("16:9");
    expect(closestAspectRatio(1080, 1350, ["16:9", "9:16", "1:1", "3:4"])).toBe("3:4");
    expect(closestAspectRatio(2560, 1080, ["16:9", "21:9"])).toBe("21:9");
  });
});
