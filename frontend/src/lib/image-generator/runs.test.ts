import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/client";
import type { ImageRun } from "@/types/image-generator";
import { generationError, pruneRuns, runningCount, runsBeforeNew, stripRuns } from "./runs";

function run(id: string, status: ImageRun["status"], seen = false): ImageRun {
  return {
    id,
    jobId: null,
    prompt: id,
    modelName: "Model",
    count: 1,
    ratio: "1:1",
    startedAt: 0,
    status,
    error: null,
    canRetry: true,
    seen,
  };
}

describe("stripRuns", () => {
  it("is empty for a single run, so one generation at a time shows no strip", () => {
    expect(stripRuns([run("a", "running")], "a")).toEqual([]);
    expect(stripRuns([run("a", "done", true)], "a")).toEqual([]);
  });

  it("shows every run that still matters once there are two", () => {
    const runs = [run("b", "running"), run("a", "running")];
    expect(stripRuns(runs, "b").map((item) => item.id)).toEqual(["b", "a"]);
  });

  it("keeps a finished run the user hasn't seen", () => {
    const runs = [run("b", "running"), run("a", "done")];
    expect(stripRuns(runs, "b").map((item) => item.id)).toEqual(["b", "a"]);
  });

  it("drops a finished run once seen, unless it is on the canvas", () => {
    const runs = [run("b", "running"), run("a", "done", true)];
    expect(stripRuns(runs, "b")).toEqual([]);
    expect(stripRuns(runs, "a").map((item) => item.id)).toEqual(["b", "a"]);
  });

  it("keeps failed runs until they are retried or dismissed", () => {
    const runs = [run("b", "done", true), run("a", "failed")];
    expect(stripRuns(runs, "b").map((item) => item.id)).toEqual(["b", "a"]);
  });
});

describe("pruneRuns", () => {
  it("forgets seen results that aren't on the canvas", () => {
    const runs = [run("c", "running"), run("b", "done", true), run("a", "done")];
    expect(pruneRuns(runs, "c").map((item) => item.id)).toEqual(["c", "a"]);
  });
});

describe("runsBeforeNew", () => {
  it("lets finished runs go to History when another starts, keeping running and failed ones", () => {
    const runs = [run("d", "done"), run("c", "done", true), run("b", "failed"), run("a", "running")];
    expect(runsBeforeNew(runs).map((item) => item.id)).toEqual(["b", "a"]);
  });
});

describe("runningCount", () => {
  it("counts only runs still being made", () => {
    expect(runningCount([run("a", "running"), run("b", "failed"), run("c", "done"), run("d", "running")])).toBe(2);
  });
});

describe("generationError", () => {
  it("explains the running limit with what to do", () => {
    const error = new ApiError(429, "TOO_MANY_ACTIVE_JOBS", "Too many active jobs");
    expect(generationError(error)).toMatch(/Retry when one finishes/);
  });
});
