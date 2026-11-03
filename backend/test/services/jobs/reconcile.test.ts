import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { FalError } from "../../../src/clients/fal.js";
import { T } from "../../../src/db/tables.js";
import { runGenerate } from "../../../src/services/jobs/generate.js";
import { createJob } from "../../../src/services/jobs/jobs.js";
import {
  reconcileSuffix,
  runReconcile,
} from "../../../src/services/jobs/reconcile.js";
import { createWorkerApp } from "../../../src/worker/server.js";
import { makeDeps } from "../../helpers/app.js";
import { seedTestCatalog } from "../../helpers/catalog.js";
import { resetDb, testDb } from "../../helpers/db.js";
import { createFundedUser } from "../../helpers/factories.js";
import { createUpload } from "../../../src/services/uploads.js";

const MIN = 60_000;

describe("runReconcile", () => {
  let h: ReturnType<typeof makeDeps>;
  let userId: string;
  let n = 0;
  beforeEach(async () => {
    await resetDb();
    await seedTestCatalog(testDb);
    h = makeDeps();
    userId = await createFundedUser(h.deps, 1000);
  });

  async function newJob(model = "flux-schnell"): Promise<string> {
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
    n += 1;
    const { job } = await createJob(
      h.deps,
      userId,
      { model, prompt: "a cat", uploadIds, options: {} },
      `k${n}`,
    );
    h.queue.tasks.length = 0; // only reconciler enqueues count
    return job.jobId;
  }
  async function submittedJob(model = "flux-schnell"): Promise<string> {
    const id = await newJob(model);
    await runGenerate(h.deps, id);
    h.queue.tasks.length = 0;
    return id;
  }
  const row = (id: string) => testDb(T.jobs).where({ id }).first();

  it("re-queues a queued job older than 2 minutes", async () => {
    const old = await newJob();
    h.clock.advance(2 * MIN);
    const fresh = await newJob();
    h.clock.advance(1 * MIN);
    const counts = await runReconcile(h.deps);
    expect(counts.requeuedGenerate).toBe(1);
    expect(h.queue.tasks).toHaveLength(1);
    expect(h.queue.tasks[0]).toMatchObject({
      kind: "generate",
      jobId: old,
      suffix: reconcileSuffix(0, h.clock.now()),
    });
    expect(h.queue.tasks.some((t) => t.jobId === fresh)).toBe(false);
  });

  it("leaves a 1 minute old queued job untouched", async () => {
    await newJob();
    h.clock.advance(1 * MIN);
    expect(await runReconcile(h.deps)).toEqual({
      requeuedGenerate: 0,
      requeuedFinalize: 0,
      polled: 0,
      timedOut: 0,
    });
    expect(h.queue.tasks).toHaveLength(0);
  });

  it("re-queues expired submitting and finalizing leases", async () => {
    const a = await newJob();
    const b = await submittedJob();
    const c = await newJob();
    const now = h.clock.now();
    await testDb(T.jobs)
      .where({ id: a })
      .update({
        status: "submitting",
        lease_expires_at: new Date(now.getTime() - 1000),
        updated_at: now,
      });
    await testDb(T.jobs)
      .where({ id: b })
      .update({
        status: "finalizing",
        lease_expires_at: new Date(now.getTime() - 1000),
        updated_at: now,
      });
    await testDb(T.jobs)
      .where({ id: c })
      .update({
        status: "submitting",
        lease_expires_at: new Date(now.getTime() + 60_000),
        updated_at: now,
      });
    const counts = await runReconcile(h.deps);
    expect(counts).toMatchObject({
      requeuedGenerate: 1,
      requeuedFinalize: 1,
    });
    expect(h.queue.tasks.map((t) => [t.kind, t.jobId])).toEqual([
      ["generate", a],
      ["finalize", b],
    ]);
  });

  it("polls fal for submitted jobs older than 3 minutes and queues finalize when completed", async () => {
    const done = await submittedJob();
    const running = await submittedJob();
    const young = await submittedJob();
    h.clock.advance(4 * MIN);
    // young got updated recently
    await testDb(T.jobs)
      .where({ id: young })
      .update({ updated_at: h.clock.now() });
    const reqOf = async (id: string) => (await row(id)).fal_request_id;
    h.fal.statuses.set(await reqOf(done), "COMPLETED");
    h.fal.statuses.set(await reqOf(running), "IN_PROGRESS");
    const counts = await runReconcile(h.deps);
    expect(counts).toMatchObject({ polled: 2, requeuedFinalize: 1 });
    expect(h.queue.tasks).toHaveLength(1);
    expect(h.queue.tasks[0]).toMatchObject({ kind: "finalize", jobId: done });
    expect(h.fal.calls.filter((c) => c.method === "status")).toHaveLength(2);
  });

  it("logs a fal status error as a warning and moves on", async () => {
    const a = await submittedJob();
    h.clock.advance(1_000); // a is older, so it is polled first
    const b = await submittedJob();
    h.clock.advance(4 * MIN);
    h.fal.failNext("status", new FalError("boom", true, 500));
    h.fal.statuses.set((await row(b)).fal_request_id, "COMPLETED");
    await runReconcile(h.deps);
    expect(h.queue.tasks.map((t) => t.jobId)).toEqual([b]);
    expect(h.logs.some((l) => l.level === "warn" && l.jobId === a)).toBe(true);
  });

  it("times out a job past its model timeout, cancels at fal and releases once", async () => {
    const id = await submittedJob("kling-i2v");
    h.clock.advance(61 * MIN);
    const counts = await runReconcile(h.deps);
    expect(counts.timedOut).toBe(1);
    expect(h.fal.calls.filter((c) => c.method === "cancel")).toHaveLength(1);
    expect(await row(id)).toMatchObject({
      status: "failed",
      error_code: "TIMED_OUT",
    });
    const released = () =>
      testDb(T.creditAllocations).where({ job_id: id, status: "released" });
    expect(await released()).toHaveLength(1);
    expect((await runReconcile(h.deps)).timedOut).toBe(0);
    expect(await released()).toHaveLength(1);
    expect(h.fal.calls.filter((c) => c.method === "cancel")).toHaveLength(1);
  });

  it("still fails a timed-out job when fal cancel errors", async () => {
    const id = await submittedJob();
    h.clock.advance(11 * MIN);
    h.fal.failNext("cancel", new FalError("nope", false, 400));
    expect((await runReconcile(h.deps)).timedOut).toBe(1);
    expect(await row(id)).toMatchObject({
      status: "failed",
      error_code: "TIMED_OUT",
    });
  });

  it("does not time out a flux job before its limit but polls it", async () => {
    const id = await submittedJob();
    h.clock.advance(9 * MIN);
    const counts = await runReconcile(h.deps);
    expect(counts).toMatchObject({ timedOut: 0, polled: 1 });
    expect((await row(id)).status).toBe("submitted");
  });

  it("dedupes within 10 minutes and re-queues after", async () => {
    await newJob();
    h.clock.set(
      new Date(
        Math.ceil(h.clock.now().getTime() / 600_000) * 600_000 + 3 * MIN,
      ),
    );
    await runReconcile(h.deps);
    h.clock.advance(1 * MIN);
    await runReconcile(h.deps);
    expect(h.queue.tasks).toHaveLength(1);
    h.clock.advance(10 * MIN);
    await runReconcile(h.deps);
    expect(h.queue.tasks).toHaveLength(2);
  });

  it("handles at most 100 rows per bucket", async () => {
    const now = h.clock.now();
    await testDb(T.jobs).insert(
      Array.from({ length: 101 }, (_, i) => ({
        user_id: userId,
        model_key: "flux-schnell",
        input: "{}",
        credit_cost: 0,
        status: "queued",
        idempotency_key: `bulk${i}`,
        request_hash: "x",
        created_at: new Date(now.getTime() - 10 * MIN),
        updated_at: new Date(now.getTime() - 10 * MIN),
      })),
    );
    expect((await runReconcile(h.deps)).requeuedGenerate).toBe(100);
    expect(h.queue.tasks).toHaveLength(100);
  });

  it("skips a failing row and continues", async () => {
    const a = await newJob();
    h.clock.advance(1_000); // a is older, so it is enqueued first
    const b = await newJob();
    h.clock.advance(3 * MIN);
    h.queue.failNext(1);
    const counts = await runReconcile(h.deps);
    expect(counts.requeuedGenerate).toBe(1);
    expect(h.queue.tasks.map((t) => t.jobId)).toEqual([b]);
    expect(a).not.toBe(b);
  });

  it("POST /tasks/reconcile returns the counts", async () => {
    const res = await request(createWorkerApp(h.deps)).post("/tasks/reconcile");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      requeuedGenerate: 0,
      requeuedFinalize: 0,
      polled: 0,
      timedOut: 0,
    });
  });
});
