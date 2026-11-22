import { describe, expect, it } from "vitest";
import { defaultVideoSettings } from "@/components/video-generator/constants";
import type { JobView } from "@/lib/api/types";
import { estimateBody, jobToVideoResults, jobValues, resolutionRank, uploadFieldsFor } from "./models";
import { hailuo, kling21, kling3MC, klingO3Ref, seedance } from "./testModels";

describe("toVideoModel", () => {
  it("reads a model's choices from its schema", () => {
    expect(seedance).toMatchObject({
      id: "seedance25_generate",
      maker: "ByteDance",
      modes: ["text", "image", "reference"],
      resolutions: ["480p", "720p"],
      aspectRatios: ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"],
      audio: true,
      endFrame: true,
      maxReferences: 4,
      clipTypes: [],
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

  it("prices with stand-ins for the prompt and each upload the mode sends", () => {
    const body = estimateBody(
      seedance,
      { ...settings, mode: "image" },
      { start: null, end: null, references: [], clip: null },
    );
    expect(body).toMatchObject({
      plugin: "seedance25",
      operation: "generate",
      input: { prompt: "estimate", duration: "10" },
    });
    expect(body.input.image).toHaveLength(1);
    expect(body).not.toHaveProperty("videoSeconds");
    const text = estimateBody(seedance, settings, { start: null, end: null, references: [], clip: null });
    expect(text.input.image).toBeUndefined();
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

  it("has nothing for an unfinished job, and groups by the job's video idea", () => {
    expect(jobToVideoResults({ ...job, status: "submitted", outputs: [] })).toEqual([]);
    expect(jobToVideoResults(job)[0].batchId).toBe("j1");
    expect(jobToVideoResults({ ...job, projectId: "p1" })[0].batchId).toBe("p1");
  });
});

describe("modes from upload fields", () => {
  it("offers only what a model's uploads allow", () => {
    expect(kling21.modes).toEqual(["text", "image"]);
    expect(klingO3Ref).toMatchObject({ modes: ["reference"], maxReferences: 4, endFrame: false });
    expect(kling3MC).toMatchObject({ modes: ["motion"], clipTypes: ["video/mp4", "video/quicktime"], durations: [5] });
  });

  it("sends each mode only its own files, as many as the model takes", () => {
    const inputs = { start: "s", end: "e", references: ["a", "b", "c", "d", "x"], clip: "c" };
    expect(uploadFieldsFor(seedance, "image", inputs)).toEqual({ image: ["s"], end_image: ["e"] });
    expect(uploadFieldsFor(kling21, "image", inputs)).toEqual({ image: ["s"] });
    expect(uploadFieldsFor(seedance, "reference", inputs)).toEqual({ reference_images: ["a", "b", "c", "d"] });
    expect(uploadFieldsFor(kling3MC, "motion", inputs)).toEqual({ image: ["s"], video: ["c"] });
    expect(uploadFieldsFor(seedance, "text", inputs)).toEqual({});
  });

  it("prices motion control on the clip's length, a stand-in before there is one", () => {
    const motion = { ...defaultVideoSettings, mode: "motion" as const, model: kling3MC.id };
    const none = { start: null, end: null, references: [], clip: null };
    expect(estimateBody(kling3MC, motion, none)).toMatchObject({
      videoSeconds: 5,
      input: { image: [expect.any(String)], video: [expect.any(String)] },
    });
    expect(estimateBody(kling3MC, motion, { ...none, clip: { duration: 8.44 } }).videoSeconds).toBe(8.4);
    const refs = estimateBody(klingO3Ref, { ...motion, mode: "reference" }, { ...none, references: [1, 2] });
    expect(refs.input.reference_images).toHaveLength(2);
  });

  it("reads a job's mode back from the files it sent", () => {
    const job = {
      jobId: "j",
      projectId: null,
      status: "completed" as const,
      model: "m",
      creditCost: 1,
      createdAt: "2026-11-22T10:00:00.000Z",
      completedAt: null,
      outputs: [{ index: 0, mimeType: "video/mp4", url: "https://v" }],
    };
    const mode = (input: Record<string, unknown>) => jobToVideoResults({ ...job, input })[0].mode;
    expect(mode({ image: ["a"], video: ["b"] })).toBe("motion");
    expect(mode({ reference_images: ["a"] })).toBe("reference");
    expect(mode({ image: ["a"], end_image: ["b"] })).toBe("image");
    expect(mode({ prompt: "x" })).toBe("text");
  });
});
