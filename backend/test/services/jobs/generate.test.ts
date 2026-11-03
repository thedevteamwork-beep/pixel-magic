import { randomUUID } from "node:crypto";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { FalError } from "../../../src/clients/fal.js";
import { getJob } from "../../../src/db/repositories/jobs.repo.js";
import { T } from "../../../src/db/tables.js";
import { createUpload } from "../../../src/services/uploads.js";
import {
  falWebhookUrl,
  runGenerate,
} from "../../../src/services/jobs/generate.js";
import { createJob } from "../../../src/services/jobs/jobs.js";
import { createWorkerApp } from "../../../src/worker/server.js";
import { makeDeps } from "../../helpers/app.js";
import { seedTestCatalog } from "../../helpers/catalog.js";
import { resetDb, testDb } from "../../helpers/db.js";
import { createFundedUser } from "../../helpers/factories.js";

describe("runGenerate", () => {
  let h: ReturnType<typeof makeDeps>;
  let userId: string;
  beforeEach(async () => {
    await resetDb();
    await seedTestCatalog(testDb);
    h = makeDeps();
    userId = await createFundedUser(h.deps, 100);
  });

  async function fluxJob(key = "k1"): Promise<string> {
    const { job } = await createJob(
      h.deps,
      userId,
      { model: "flux-schnell", prompt: "a cat", uploadIds: [], options: {} },
      key,
    );
    return job.jobId;
  }
  async function reserved(jobId: string): Promise<number> {
    const rows = await testDb(T.creditAllocations).where({
      job_id: jobId,
      status: "reserved",
    });
    return rows.reduce((s, r) => s + r.amount, 0);
  }
  const retryable = () => new FalError("fal down", true, 503);

  it("submits to fal and links the request", async () => {
    const id = await fluxJob();
    expect(await runGenerate(h.deps, id)).toBe(200);
    expect(h.fal.calls[0]).toEqual({
      method: "submit",
      args: [
        "fal-ai/flux/schnell",
        expect.objectContaining({ enable_safety_checker: true }),
        `https://api.test/webhooks/fal?jobId=${id}`,
      ],
    });
    expect(await getJob(testDb, id)).toMatchObject({
      status: "submitted",
      fal_request_id: "req_1",
      attempts: 1,
      lease_expires_at: null,
      submitted_at: h.clock.now(),
    });
  });

  it("puts the job id in the fal webhook URL", () => {
    expect(falWebhookUrl(h.deps.config, "abc")).toBe(
      "https://api.test/webhooks/fal?jobId=abc",
    );
  });

  it("signs input URLs for 24 h from the inputs bucket", async () => {
    const up = await createUpload(h.deps, userId, {
      filename: "a.png",
      mimeType: "image/png",
      sizeBytes: 100,
    });
    h.storage.put("inputs", up.path, { sizeBytes: 100, mimeType: "image/png" });
    const { job } = await createJob(
      h.deps,
      userId,
      {
        model: "kling-i2v",
        prompt: "move",
        uploadIds: [up.uploadId],
        options: {},
      },
      "k-kling",
    );
    expect(await runGenerate(h.deps, job.jobId)).toBe(200);
    const signed = h.storage.calls.find((c) => c.method === "createSignedUrl");
    expect(signed?.args).toEqual(["inputs", up.path, 86400]);
    const url = await h.storage.createSignedUrl("inputs", up.path, 86400);
    const submit = h.fal.calls.find((c) => c.method === "submit");
    expect(submit?.args[1]).toMatchObject({ image_url: url });
  });

  it("ignores a second delivery once submitted", async () => {
    const id = await fluxJob();
    expect(await runGenerate(h.deps, id)).toBe(200);
    expect(await runGenerate(h.deps, id)).toBe(200);
    expect(h.fal.calls).toHaveLength(1);
  });

  it("leaves a job with a live lease alone", async () => {
    const id = await fluxJob();
    await testDb(T.jobs)
      .where({ id })
      .update({
        status: "submitting",
        lease_expires_at: new Date(h.clock.now().getTime() + 60_000),
      });
    expect(await runGenerate(h.deps, id)).toBe(200);
    expect(h.fal.calls).toHaveLength(0);
  });

  it("takes over an expired submitting lease and resubmits", async () => {
    const id = await fluxJob();
    await testDb(T.jobs)
      .where({ id })
      .update({
        status: "submitting",
        attempts: 1,
        lease_expires_at: new Date(h.clock.now().getTime() - 1000),
      });
    expect(await runGenerate(h.deps, id)).toBe(200);
    expect(await getJob(testDb, id)).toMatchObject({
      status: "submitted",
      attempts: 2,
    });
  });

  it("returns 503 and requeues on a retryable fal error", async () => {
    const id = await fluxJob();
    h.fal.failNext("submit", retryable());
    expect(await runGenerate(h.deps, id)).toBe(503);
    expect(await getJob(testDb, id)).toMatchObject({
      status: "queued",
      lease_expires_at: null,
      attempts: 1,
    });
    expect(await reserved(id)).toBe(1);
  });

  it("requeues on a storage error while signing", async () => {
    const up = await createUpload(h.deps, userId, {
      filename: "a.png",
      mimeType: "image/png",
      sizeBytes: 100,
    });
    h.storage.put("inputs", up.path, { sizeBytes: 100, mimeType: "image/png" });
    const { job } = await createJob(
      h.deps,
      userId,
      {
        model: "kling-i2v",
        prompt: "move",
        uploadIds: [up.uploadId],
        options: {},
      },
      "k-kling",
    );
    h.storage.failNext("createSignedUrl");
    expect(await runGenerate(h.deps, job.jobId)).toBe(503);
    expect((await getJob(testDb, job.jobId))?.status).toBe("queued");
    expect(h.fal.calls).toHaveLength(0);
  });

  it("fails with SUBMIT_FAILED after the fifth retryable error and releases credits", async () => {
    const id = await fluxJob();
    await testDb(T.jobs).where({ id }).update({ attempts: 4 });
    h.fal.failNext("submit", retryable());
    expect(await runGenerate(h.deps, id)).toBe(200);
    expect(await getJob(testDb, id)).toMatchObject({
      status: "failed",
      error_code: "SUBMIT_FAILED",
      attempts: 5,
    });
    expect(await reserved(id)).toBe(0);
  });

  it("fails with SUBMIT_REJECTED on a 4xx and releases credits", async () => {
    const id = await fluxJob();
    h.fal.failNext("submit", new FalError("bad input", false, 422));
    expect(await runGenerate(h.deps, id)).toBe(200);
    expect(await getJob(testDb, id)).toMatchObject({
      status: "failed",
      error_code: "SUBMIT_REJECTED",
      error_message: "The model rejected this request.",
    });
    expect(await reserved(id)).toBe(0);
  });

  it("fails with MODEL_UNAVAILABLE when the model is gone and releases credits", async () => {
    const id = await fluxJob();
    await testDb(T.jobs).where({ id }).update({ model_key: "removed-model" });
    expect(await runGenerate(h.deps, id)).toBe(200);
    expect(await getJob(testDb, id)).toMatchObject({
      status: "failed",
      error_code: "MODEL_UNAVAILABLE",
    });
    expect(await reserved(id)).toBe(0);
    expect(h.fal.calls).toHaveLength(0);
  });

  it("POST /tasks/generate rejects a bad body with 422", async () => {
    const app = createWorkerApp(h.deps);
    expect(
      (await request(app).post("/tasks/generate").send({ jobId: "nope" }))
        .status,
    ).toBe(422);
    expect((await request(app).post("/tasks/generate").send({})).status).toBe(
      422,
    );
  });

  it("POST /tasks/generate runs the job and answers with its status", async () => {
    const id = await fluxJob();
    const app = createWorkerApp(h.deps);
    expect(
      (await request(app).post("/tasks/generate").send({ jobId: id })).status,
    ).toBe(200);
    expect((await getJob(testDb, id))?.status).toBe("submitted");
    expect(
      (await request(app).post("/tasks/generate").send({ jobId: randomUUID() }))
        .status,
    ).toBe(200);
  });
});
