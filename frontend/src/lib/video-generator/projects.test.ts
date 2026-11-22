import { describe, expect, it } from "vitest";
import { defaultVideoSettings } from "@/components/video-generator/constants";
import type { ProjectView } from "@/lib/api/types";
import { sameProjectData, settingsFromProject, videoProjectData, videoProjectTitle } from "./projects";

const settings = {
  ...defaultVideoSettings,
  prompt: "  A paper boat on a rainy street  ",
  mode: "image" as const,
  model: "kling25_generate",
  duration: 10,
  aspectRatio: "9:16",
  resolution: "1080p",
  audio: false,
  count: 2,
};

const view = (data: Record<string, unknown>): ProjectView => ({
  projectId: "p1",
  type: "video",
  title: "Paper boat",
  data,
  cover: null,
  upload: null,
  createdAt: "2026-11-21T10:00:00.000Z",
  updatedAt: "2026-11-21T10:00:00.000Z",
});

describe("video projects", () => {
  it("saves the direction and settings, with the start image when there is one", () => {
    expect(videoProjectData(settings, "up-1")).toEqual({
      prompt: "A paper boat on a rainy street",
      mode: "image",
      model: "kling25_generate",
      duration: 10,
      aspectRatio: "9:16",
      resolution: "1080p",
      audio: false,
      count: 2,
      startImageUploadId: "up-1",
    });
    expect(videoProjectData({ ...settings, resolution: "" })).not.toHaveProperty("resolution");
  });

  it("restores the saved settings, keeping the base for anything missing", () => {
    const restored = settingsFromProject(view({ prompt: "Waves", model: "veo31Fast_generate", duration: 8 }), settings);
    expect(restored).toMatchObject({ prompt: "Waves", model: "veo31Fast_generate", duration: 8, aspectRatio: "9:16" });
    expect(settingsFromProject(view({ mode: "nonsense" }), settings).mode).toBe("image");
  });

  it("tells when saving would change nothing", () => {
    const data = videoProjectData(settings, "up-1");
    expect(sameProjectData(view({ ...data }), data)).toBe(true);
    expect(sameProjectData(view({ ...data, count: 1 }), data)).toBe(false);
    expect(sameProjectData(view({ ...data }), videoProjectData(settings))).toBe(false);
  });

  it("titles a project from its prompt, short", () => {
    expect(videoProjectTitle("  Waves   at dusk ")).toBe("Waves at dusk");
    expect(videoProjectTitle("")).toBe("Animated image");
    expect(videoProjectTitle("x".repeat(200))).toHaveLength(80);
  });
});
