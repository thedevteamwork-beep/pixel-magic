import { describe, expect, it } from "vitest";
import type { JobView } from "@/lib/api/types";
import { appendPage, replaceJob } from "@/lib/creations/pages";

function job(jobId: string, status: JobView["status"] = "queued"): JobView {
  return {
    jobId,
    status,
    model: "m",
    creditCost: 1,
    createdAt: "2026-01-01T00:00:00Z",
    completedAt: null,
    outputs: [],
  };
}

describe("appendPage", () => {
  it("drops jobs already in the list and keeps the order", () => {
    const result = appendPage([job("a"), job("b")], [job("b"), job("c"), job("d")]);
    expect(result.map((j) => j.jobId)).toEqual(["a", "b", "c", "d"]);
  });

  it("keeps the existing copy of a duplicate", () => {
    const result = appendPage([job("a", "completed")], [job("a", "queued")]);
    expect(result[0].status).toBe("completed");
  });
});

describe("replaceJob", () => {
  it("swaps the job with the same id and leaves the others alone", () => {
    const list = [job("a"), job("b"), job("c")];
    const updated = job("b", "completed");
    const result = replaceJob(list, updated);
    expect(result).toEqual([list[0], updated, list[2]]);
    expect(result[0]).toBe(list[0]);
  });

  it("returns an equal list when the id is not present", () => {
    const list = [job("a")];
    expect(replaceJob(list, job("z"))).toEqual(list);
  });
});
