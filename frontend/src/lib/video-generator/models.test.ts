import { describe, expect, it } from "vitest";
import { defaultVideoSettings } from "@/components/video-generator/constants";
import type { JobView } from "@/lib/api/types";
import { estimateInput, jobToVideoResults, jobValues, resolutionRank } from "./models";
import { hailuo, kling21, seedance } from "./testModels";

describe("toVideoModel", () => {
  it("reads a model's choices from its schema", () => {
    expect(seedance).toMatchObject({
      id: "seedance25_generate",
      maker: "ByteDance",
      modes: ["text", "image"],
      resolutions: ["480p", "720p"],
      aspectRatios: ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"],
      audio: true,
      endFrame: false,
      maxReferences: 0,
    });
    expect(seedance.durations).toHaveLength(27);
    expect(seedance.durations[0]).toBe(4);
    expect(seedance.durationMarks).toEqual([4, 11, 17, 24, 30]);
    expect(kling21).toMatchObject({ resolutions: [], audio: false, durations: [5, 10], durationMarks: undefined });
  });

  it("orders resolutions by size, 4K last", () => {
    expect(["4K", "720p", "360p", "1440p"].sort((a, b) => resolutionRank(a) - resolutionRank(b))).toEqual([
      "360p",
      "720p",
      "1440p",
      "4K",
    ]);
  });
});

describe("job input", () => {
  const settings = { ...defaultVideoSettings, duration: 10, resolution: "720p", aspectRatio: "9:16", audio: true };

  it("sends only the fields the model declares, the duration as it names it", () => {
    expect(jobValues(seedance, settings)).toEqual({
      duration: "10",
      resolution: "720p",
      aspect_ratio: "9:16",
      audio: true,
    });
    expect(jobValues(kling21, settings)).toEqual({ duration: "10", aspect_ratio: "9:16" });
    expect(jobValues(hailuo, { ...settings, resolution: "1080p" })).toEqual({ duration: "10", resolution: "1080p" });
  });

  it("prices image to video with a stand-in upload", () => {
    const input = estimateInput(seedance, { ...settings, mode: "image" });
    expect(input).toMatchObject({ prompt: "estimate", duration: "10" });
    expect(input.image).toHaveLength(1);
    expect(estimateInput(seedance, settings).image).toBeUndefined();
  });
});

describe("jobToVideoResults", () => {
  const job: JobView = {
    jobId: "j1",
    projectId: null,
    status: "completed",
    model: "seedance25_generate",
    input: { prompt: "Waves", image: ["u1"], duration: "5", resolution: "720p", aspect_ratio: "16:9", audio: true },
    creditCost: 56,
    createdAt: "2026-11-20T10:00:00.000Z",
    completedAt: "2026-11-20T10:01:00.000Z",
    outputs: [{ index: 0, mimeType: "video/mp4", url: "https://storage/v.mp4" }],
  };

  it("reads a completed job's video and the settings that made it", () => {
    expect(jobToVideoResults(job, { batchId: "b1", poster: "blob:start" })).toEqual([
      {
        id: "j1:0",
        batchId: "b1",
        jobId: "j1",
        url: "https://storage/v.mp4",
        poster: "blob:start",
        alt: "Generated video: Waves",
        prompt: "Waves",
        model: "seedance25_generate",
        mode: "image",
        aspectRatio: "16:9",
        resolution: "720p",
        duration: 5,
        audio: true,
        creditCost: 56,
        createdAt: "2026-11-20T10:01:00.000Z",
        favorite: false,
      },
    ]);
  });

  it("has nothing for an unfinished job, and is its own batch by default", () => {
    expect(jobToVideoResults({ ...job, status: "submitted", outputs: [] })).toEqual([]);
    expect(jobToVideoResults(job)[0].batchId).toBe("j1");
  });
});
