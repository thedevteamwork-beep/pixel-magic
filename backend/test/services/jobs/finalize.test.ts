import { readFileSync } from "node:fs";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { ApiError } from "@fal-ai/client";
import { createFalClient, FalError } from "../../../src/clients/fal.js";
import { getJob } from "../../../src/db/repositories/jobs.repo.js";
import { T } from "../../../src/db/tables.js";
import {
  extensionFor,
  FINALIZE_LEASE_MS,
  runFinalize,
} from "../../../src/services/jobs/finalize.js";
import { runGenerate } from "../../../src/services/jobs/generate.js";
import { createJob } from "../../../src/services/jobs/jobs.js";
import { createUpload } from "../../../src/services/uploads.js";
import { createWorkerApp } from "../../../src/worker/server.js";
import { makeDeps } from "../../helpers/app.js";
import { seedTestCatalog } from "../../helpers/catalog.js";
import { resetDb, testDb } from "../../helpers/db.js";
import { createFundedUser } from "../../helpers/factories.js";

const fixture = (name: string): unknown =>
  JSON.parse(
    readFileSync(
      new URL(`../../fixtures/fal/${name}.json`, import.meta.url),
      "utf8",
    ),
  );

describe("runFinalize", () => {
  let h: ReturnType<typeof makeDeps>;
  let userId: string;
  beforeEach(async () => {
    await resetDb();
    await seedTestCatalog(testDb);
    h = makeDeps();
    userId = await createFundedUser(h.deps, 100);
  });

  async function submittedJob(model = "flux-schnell", key = "k1") {
    const uploadIds: string[] = [];
    if (model === "kling-i2v") {
      const up = await createUpload(h.deps, userId, {
        filename: "a.png",
        mimeType: "image/png",
        sizeBytes: 100,
      });
      h.storage.put("inputs", up.path, {
        sizeBytes: 100,
        mimeType: "image/png",
      });
      uploadIds.push(up.uploadId);
    }
    const { job } = await createJob(
      h.deps,
      userId,
      { model, prompt: "a cat", uploadIds, options: {} },
      key,
    );
    await runGenerate(h.deps, job.jobId);
    h.fal.statuses.set("req_1", "COMPLETED");
    return job.jobId;
  }
  async function allocationStatuses(jobId: string): Promise<string[]> {
    const rows = await testDb(T.creditAllocations).where({ job_id: jobId });
    return rows.map((r) => r.status);
  }
  const fluxResult = (over: Record<string, unknown> = {}) => ({
    ok: true as const,
    data: { ...(fixture("flux-schnell") as object), ...over },
  });

  it("copies outputs, completes the job and captures the credits", async () => {
    const id = await submittedJob();
    h.fal.results.set("req_1", {
      ok: true,
      data: {
        ...(fixture("flux-schnell") as { images: unknown[] }),
        images: (fixture("flux-schnell") as { images: unknown[] }).images.slice(
          0,
          1,
        ),
        has_nsfw_concepts: [false],
      },
    });
    expect(await runFinalize(h.deps, id)).toBe(200);
    expect(h.storage.copies).toEqual([
      {
        bucket: "outputs",
        path: `${userId}/${id}/0.jpg`,
        sourceUrl: "https://fal.media/files/a.jpg",
        mimeType: "image/jpeg",
      },
    ]);
    expect(await getJob(testDb, id)).toMatchObject({
      status: "completed",
      outputs: [
        {
          bucket: "outputs",
          path: `${userId}/${id}/0.jpg`,
          mimeType: "image/jpeg",
        },
      ],
      completed_at: h.clock.now(),
      lease_expires_at: null,
    });
    expect(await allocationStatuses(id)).toEqual(["captured"]);
  });

  it("claims with a 15 minute lease", async () => {
    const id = await submittedJob();
    h.fal.results.set("req_1", fluxResult());
    h.storage.copyFromUrl = async () => {
      expect((await getJob(testDb, id))?.lease_expires_at).toEqual(
        new Date(h.clock.now().getTime() + FINALIZE_LEASE_MS),
      );
    };
    expect(await runFinalize(h.deps, id)).toBe(200);
  });

  it("returns 503 and goes back to submitted while fal is still running", async () => {
    const id = await submittedJob();
    h.fal.statuses.set("req_1", "IN_PROGRESS");
    expect(await runFinalize(h.deps, id)).toBe(503);
    expect(await getJob(testDb, id)).toMatchObject({
      status: "submitted",
      lease_expires_at: null,
    });
    expect(await allocationStatuses(id)).toEqual(["reserved"]);
  });

  it.each([401, 403, 503])(
    "treats what the real client throws for a %i status as 503 back to submitted",
    async (status) => {
      const id = await submittedJob();
      h.deps.fal = createFalClient(h.deps.config, {
        queue: {
          status: async () => {
            throw new ApiError({ message: `http ${status}`, status });
          },
        },
      } as never);
      expect(await runFinalize(h.deps, id)).toBe(503);
      expect(await getJob(testDb, id)).toMatchObject({
        status: "submitted",
        lease_expires_at: null,
      });
      expect(await allocationStatuses(id)).toEqual(["reserved"]);
    },
  );

  it("fails with GENERATION_FAILED on a non-retryable fal status error", async () => {
    const id = await submittedJob();
    h.fal.failNext("status", new FalError("not found", false, 404));
    expect(await runFinalize(h.deps, id)).toBe(200);
    expect(await getJob(testDb, id)).toMatchObject({
      status: "failed",
      error_code: "GENERATION_FAILED",
      lease_expires_at: null,
    });
    expect(await allocationStatuses(id)).toEqual(["released"]);
  });

  it("goes back to submitted with a 503 on an unexpected error", async () => {
    const id = await submittedJob();
    // FakeFal.result throws a plain Error when no result is configured.
    expect(await runFinalize(h.deps, id)).toBe(503);
    expect(await getJob(testDb, id)).toMatchObject({
      status: "submitted",
      lease_expires_at: null,
    });
    expect(await allocationStatuses(id)).toEqual(["reserved"]);
    expect(h.logs.some((l) => l.level === "error" && l.jobId === id)).toBe(
      true,
    );
  });

  it("does not capture credits when the job stopped finalizing meanwhile", async () => {
    const id = await submittedJob();
    h.fal.results.set("req_1", fluxResult());
    h.storage.copyFromUrl = async () => {
      await testDb(T.jobs).where({ id }).update({ status: "failed" });
    };
    expect(await runFinalize(h.deps, id)).toBe(200);
    expect((await getJob(testDb, id))?.status).toBe("failed");
    expect(await allocationStatuses(id)).toEqual(["reserved"]);
  });

  it("fails with OUTPUT_INVALID for an unsupported mime type without copying", async () => {
    const id = await submittedJob();
    h.fal.results.set("req_1", {
      ok: true,
      data: {
        images: [
          { url: "https://fal.media/files/a.gif", content_type: "image/gif" },
        ],
      },
    });
    expect(await runFinalize(h.deps, id)).toBe(200);
    expect(h.storage.copies).toEqual([]);
    expect(await getJob(testDb, id)).toMatchObject({
      status: "failed",
      error_code: "OUTPUT_INVALID",
    });
    expect(await allocationStatuses(id)).toEqual(["released"]);
  });

  it("returns 503 back to submitted on a retryable error from result", async () => {
    const id = await submittedJob();
    h.fal.failNext("result", new FalError("down", true, 503));
    expect(await runFinalize(h.deps, id)).toBe(503);
    expect((await getJob(testDb, id))?.status).toBe("submitted");
    expect(await allocationStatuses(id)).toEqual(["reserved"]);
  });

  it("fails with GENERATION_FAILED on a fal error and releases credits", async () => {
    const id = await submittedJob();
    h.fal.results.set("req_1", { ok: false, message: "raw fal boom" });
    expect(await runFinalize(h.deps, id)).toBe(200);
    expect(await getJob(testDb, id)).toMatchObject({
      status: "failed",
      error_code: "GENERATION_FAILED",
      error_message: "The model couldn't generate this request.",
    });
    expect(await allocationStatuses(id)).toEqual(["released"]);
  });

  it("fails with CONTENT_BLOCKED when every output is blocked and releases credits", async () => {
    const id = await submittedJob();
    h.fal.results.set("req_1", fluxResult({ has_nsfw_concepts: [true, true] }));
    expect(await runFinalize(h.deps, id)).toBe(200);
    expect(await getJob(testDb, id)).toMatchObject({
      status: "failed",
      error_code: "CONTENT_BLOCKED",
    });
    expect(await allocationStatuses(id)).toEqual(["released"]);
    expect(h.storage.copies).toEqual([]);
  });

  it("completes with the safe outputs when only some are blocked", async () => {
    const id = await submittedJob();
    h.fal.results.set("req_1", fluxResult());
    expect(await runFinalize(h.deps, id)).toBe(200);
    expect(h.storage.copies.map((c) => c.sourceUrl)).toEqual([
      "https://fal.media/files/a.jpg",
    ]);
    expect(await getJob(testDb, id)).toMatchObject({
      status: "completed",
      outputs: [
        {
          bucket: "outputs",
          path: `${userId}/${id}/0.jpg`,
          mimeType: "image/jpeg",
        },
      ],
    });
    expect(await allocationStatuses(id)).toEqual(["captured"]);
  });

  it.each([
    ["an unexpected result", { ok: true, data: { nope: 1 } }],
    ["an empty result", { ok: true, data: { images: [] } }],
  ])(
    "fails with OUTPUT_INVALID on %s and captures nothing",
    async (_n, result) => {
      const id = await submittedJob();
      h.fal.results.set("req_1", result as never);
      expect(await runFinalize(h.deps, id)).toBe(200);
      expect(await getJob(testDb, id)).toMatchObject({
        status: "failed",
        error_code: "OUTPUT_INVALID",
      });
      expect(await allocationStatuses(id)).toEqual(["released"]);
    },
  );

  it.each(["http://fal.media/a.jpg", "file:///etc/passwd"])(
    "fails with OUTPUT_INVALID without copying a non-https URL (%s)",
    async (url) => {
      const id = await submittedJob();
      h.fal.results.set("req_1", {
        ok: true,
        data: { images: [{ url, content_type: "image/jpeg" }] },
      });
      expect(await runFinalize(h.deps, id)).toBe(200);
      expect(h.storage.copies).toEqual([]);
      expect(await getJob(testDb, id)).toMatchObject({
        status: "failed",
        error_code: "OUTPUT_INVALID",
      });
      expect(await allocationStatuses(id)).toEqual(["released"]);
    },
  );

  it("returns 503 and keeps credits reserved when copying fails", async () => {
    const id = await submittedJob();
    h.fal.results.set("req_1", fluxResult());
    h.storage.failNext("copyFromUrl");
    expect(await runFinalize(h.deps, id)).toBe(503);
    expect(await getJob(testDb, id)).toMatchObject({
      status: "submitted",
      lease_expires_at: null,
    });
    expect(await allocationStatuses(id)).toEqual(["reserved"]);
  });

  it("stores kling video outputs as mp4", async () => {
    const id = await submittedJob("kling-i2v");
    h.fal.results.set("req_1", { ok: true, data: fixture("kling-i2v") });
    expect(await runFinalize(h.deps, id)).toBe(200);
    expect(h.storage.copies[0]?.path).toBe(`${userId}/${id}/0.mp4`);
  });

  it("fails with MODEL_UNAVAILABLE when the model is gone", async () => {
    const id = await submittedJob();
    await testDb(T.jobs).where({ id }).update({ model_key: "gone-model" });
    expect(await runFinalize(h.deps, id)).toBe(200);
    expect(await getJob(testDb, id)).toMatchObject({
      status: "failed",
      error_code: "MODEL_UNAVAILABLE",
    });
    expect(await allocationStatuses(id)).toEqual(["released"]);
  });

  it("does nothing for a second delivery after completion", async () => {
    const id = await submittedJob();
    h.fal.results.set("req_1", fluxResult());
    await runFinalize(h.deps, id);
    const calls = h.fal.calls.length;
    expect(await runFinalize(h.deps, id)).toBe(200);
    expect(h.fal.calls.length).toBe(calls);
    expect(await allocationStatuses(id)).toEqual(["captured"]);
  });

  it("reclaims a finalizing job whose lease expired", async () => {
    const id = await submittedJob();
    h.fal.results.set("req_1", fluxResult());
    await testDb(T.jobs)
      .where({ id })
      .update({
        status: "finalizing",
        lease_expires_at: new Date(h.clock.now().getTime() - 1000),
      });
    expect(await runFinalize(h.deps, id)).toBe(200);
    expect((await getJob(testDb, id))?.status).toBe("completed");
  });

  it("POST /tasks/finalize runs the task", async () => {
    const id = await submittedJob();
    h.fal.statuses.set("req_1", "IN_PROGRESS");
    const res = await request(createWorkerApp(h.deps))
      .post("/tasks/finalize")
      .send({ jobId: id });
    expect(res.status).toBe(503);
  });
});

describe("extensionFor", () => {
  it("maps mime types", () => {
    expect(extensionFor("image/png")).toBe("png");
    expect(extensionFor("image/jpeg")).toBe("jpg");
    expect(extensionFor("image/webp")).toBe("webp");
    expect(extensionFor("video/mp4")).toBe("mp4");
    expect(extensionFor("application/x")).toBe("bin");
  });
});
