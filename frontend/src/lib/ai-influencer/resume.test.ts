import { describe, expect, it } from "vitest";
import { defaultTraits, SAMPLE_RENDER_MS } from "@/components/ai-influencer/constants";
import { jobView } from "@/lib/generate/fixtures";
import { clearPendingSample, pendingInfluencerJob, readPendingSample, savePendingSample } from "./resume";

/** An in-memory stand-in for sessionStorage. */
function memoryStorage(): Pick<Storage, "getItem" | "setItem" | "removeItem"> {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  };
}

describe("pendingInfluencerJob", () => {
  const influencers = new Set(["p1", "p2"]);

  it("finds the newest job still running for an influencer", () => {
    const jobs = [
      jobView("completed", { jobId: "done", projectId: "p1" }),
      jobView("submitted", { jobId: "studio", projectId: null }),
      jobView("queued", { jobId: "running", projectId: "p2" }),
      jobView("finalizing", { jobId: "older", projectId: "p1" }),
    ];
    expect(pendingInfluencerJob(jobs, influencers)?.jobId).toBe("running");
  });

  it("finds nothing when no influencer job is running", () => {
    const jobs = [jobView("completed", { projectId: "p1" }), jobView("failed", { projectId: "p2" })];
    expect(pendingInfluencerJob(jobs, influencers)).toBeUndefined();
  });
});

describe("pending sample", () => {
  const pending = {
    traits: { ...defaultTraits, name: "Mira" },
    archetypeId: null,
    aspectRatio: "9:16",
    projectId: null,
  };

  it("comes back with the time it still has to wait", () => {
    const storage = memoryStorage();
    savePendingSample(storage, { ...pending, startedAt: 1_000 });
    expect(readPendingSample(storage, 1_000 + 2_000)).toEqual({
      pending: { ...pending, startedAt: 1_000 },
      remainingMs: SAMPLE_RENDER_MS - 2_000,
    });
  });

  it("is ready at once when it finished while the page was away", () => {
    const storage = memoryStorage();
    savePendingSample(storage, { ...pending, startedAt: 1_000 });
    expect(readPendingSample(storage, 1_000 + SAMPLE_RENDER_MS + 60_000)?.remainingMs).toBe(0);
  });

  it("is forgotten when cleared, stale or unreadable", () => {
    const storage = memoryStorage();
    savePendingSample(storage, { ...pending, startedAt: 1_000 });
    clearPendingSample(storage);
    expect(readPendingSample(storage, 2_000)).toBeNull();

    savePendingSample(storage, { ...pending, startedAt: 1_000 });
    expect(readPendingSample(storage, 1_000 + 31 * 60_000)).toBeNull();

    storage.setItem("pixel-magic:influencer-sample", "{not json");
    expect(readPendingSample(storage, 2_000)).toBeNull();
  });
});
