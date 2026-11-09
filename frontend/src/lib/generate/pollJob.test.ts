import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/client";
import { jobView } from "@/lib/generate/fixtures";
import { JobFailedError, PollLostError, pollJob } from "@/lib/generate/pollJob";
import type { JobView } from "@/lib/api/types";

type Step = JobView | ApiError;

function setup(steps: Step[]) {
  const sleeps: number[] = [];
  const updates: JobView[] = [];
  let gets = 0;
  const base = {
    get: async () => {
      const step = steps[gets++];
      if (step instanceof ApiError) throw step;
      return step;
    },
    intervalMs: 4000,
    sleep: async (ms: number) => {
      sleeps.push(ms);
    },
    onUpdate: (job: JobView) => updates.push(job),
  };
  return { base, sleeps, updates, gets: () => gets };
}

const network = () => new ApiError(0, "NETWORK_ERROR", "offline");
const bad502 = () => new ApiError(502, "HTTP_ERROR", "bad gateway");

describe("pollJob", () => {
  it("resolves after queued, submitted, completed and reports each", async () => {
    const t = setup([jobView("queued"), jobView("submitted"), jobView("completed")]);
    const job = await pollJob("job-1", t.base);
    expect(job.status).toBe("completed");
    expect(t.gets()).toBe(3);
    expect(t.updates).toHaveLength(3);
    expect(t.sleeps).toEqual([4000, 4000]);
  });

  it("passes the interval through (video: 8000)", async () => {
    const t = setup([jobView("queued"), jobView("completed")]);
    await pollJob("job-1", { ...t.base, intervalMs: 8000 });
    expect(t.sleeps).toEqual([8000]);
  });

  it("picks the interval from the first job once it arrives", async () => {
    const t = setup([jobView("queued", { model: "kling21_generate" }), jobView("completed")]);
    await pollJob("job-1", { ...t.base, intervalFor: (job) => (job.model === "kling21_generate" ? 8000 : 4000) });
    expect(t.sleeps).toEqual([8000]);
  });

  it("encodes the job id in the path", async () => {
    const paths: string[] = [];
    const get = async (path: string) => {
      paths.push(path);
      return jobView("completed");
    };
    await pollJob("../models", { get, intervalMs: 1 });
    expect(paths).toEqual(["/v1/jobs/..%2Fmodels"]);
  });

  it("throws JobFailedError on failed", async () => {
    const failed = jobView("failed", { error: { code: "X", message: "nope" } });
    const t = setup([jobView("queued"), failed]);
    const error = await pollJob("job-1", t.base).catch((e) => e);
    expect(error).toBeInstanceOf(JobFailedError);
    expect(error.job).toBe(failed);
  });

  it("stops at once on 401", async () => {
    const t = setup([new ApiError(401, "UNAUTHENTICATED", "x"), jobView("completed")]);
    await expect(pollJob("job-1", t.base)).rejects.toMatchObject({ status: 401 });
    expect(t.gets()).toBe(1);
  });

  it("stops at once on any 4xx", async () => {
    const t = setup([new ApiError(404, "NOT_FOUND", "x"), jobView("completed")]);
    await expect(pollJob("job-1", t.base)).rejects.toMatchObject({ status: 404 });
    expect(t.gets()).toBe(1);
  });

  it("retries 5xx and network errors, and resets on success", async () => {
    const t = setup([
      bad502(),
      network(),
      jobView("submitted"),
      bad502(),
      bad502(),
      bad502(),
      bad502(),
      jobView("completed"),
    ]);
    const job = await pollJob("job-1", t.base);
    expect(job.status).toBe("completed");
    expect(t.gets()).toBe(8);
    expect(t.updates).toHaveLength(2);
  });

  it("throws PollLostError after 5 in a row", async () => {
    const t = setup([network(), bad502(), network(), bad502(), network(), jobView("completed")]);
    await expect(pollJob("job-1", t.base)).rejects.toBeInstanceOf(PollLostError);
    expect(t.gets()).toBe(5);
  });

  it("aborts during sleep, with no further get", async () => {
    const controller = new AbortController();
    const t = setup([jobView("queued"), jobView("completed")]);
    const sleep = async () => {
      controller.abort();
      throw new DOMException("Aborted", "AbortError");
    };
    const error = await pollJob("job-1", { ...t.base, sleep, signal: controller.signal }).catch((e) => e);
    expect(error.name).toBe("AbortError");
    expect(t.gets()).toBe(1);
  });

  it("aborts before the first request when already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const t = setup([jobView("completed")]);
    const error = await pollJob("job-1", { ...t.base, signal: controller.signal }).catch((e) => e);
    expect(error.name).toBe("AbortError");
    expect(t.gets()).toBe(0);
  });
});
