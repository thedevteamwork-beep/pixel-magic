import { randomUUID } from "node:crypto";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/api/server.js";
import { T } from "../../src/db/tables.js";
import { getModel } from "../../src/models/registry.js";
import { makeDeps } from "../helpers/app.js";
import { authHeader } from "../helpers/auth.js";
import { seedTestCatalog } from "../helpers/catalog.js";
import { resetDb, testDb } from "../helpers/db.js";
import { createFundedUser } from "../helpers/factories.js";

const flux = { model: "flux-schnell", prompt: "a cat" };

describe("POST /v1/jobs", () => {
  let h: ReturnType<typeof makeDeps>;
  let userId: string;
  beforeEach(async () => {
    await resetDb();
    await seedTestCatalog(testDb);
    h = makeDeps();
    userId = await createFundedUser(h.deps, 100);
  });

  async function post(body: unknown, key: string | null = "k1", uid = userId) {
    const req = request(createApp(h.deps))
      .post("/v1/jobs")
      .set(await authHeader(uid));
    if (key !== null) req.set("Idempotency-Key", key);
    return req.send(body as object);
  }
  async function reservedFor(jobId: string): Promise<number> {
    const rows = await testDb(T.creditAllocations).where({
      job_id: jobId,
      status: "reserved",
    });
    return rows.reduce((s, r) => s + r.amount, 0);
  }
  async function jobCount(): Promise<number> {
    const r = await testDb(T.jobs).count({ n: "*" }).first();
    return Number(r?.n);
  }

  it("rejects an unknown option with 422 naming it", async () => {
    const res = await post({ ...flux, options: { durations: "5" } });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("VALIDATION_FAILED");
    expect(JSON.stringify(res.body)).toContain("durations");
    expect(await jobCount()).toBe(0);
  });

  it("rejects an unknown top-level body key with 422", async () => {
    const res = await post({ ...flux, extra: 1 });
    expect(res.status).toBe(422);
    expect(await jobCount()).toBe(0);
  });

  it("creates a queued job, reserves its cost and queues generate", async () => {
    const res = await post(flux);
    expect(res.status).toBe(202);
    expect(res.body).toMatchObject({
      status: "queued",
      creditCost: 1,
      model: "flux-schnell",
    });
    expect(await reservedFor(res.body.jobId)).toBe(1);
    expect(h.queue.tasks).toEqual([
      expect.objectContaining({
        kind: "generate",
        jobId: res.body.jobId,
        suffix: "0",
      }),
    ]);
  });

  it("replays the same key and body with 200 and no second reservation", async () => {
    const a = await post(flux);
    const b = await post({ ...flux, options: { num_images: 1 } });
    expect(b.status).toBe(200);
    expect(b.body.jobId).toBe(a.body.jobId);
    expect(await jobCount()).toBe(1);
    expect(await reservedFor(a.body.jobId)).toBe(1);
    expect(h.queue.tasks).toHaveLength(1);
  });

  it("rejects the same key with a different body with 409 IDEMPOTENCY_KEY_REUSED", async () => {
    await post(flux);
    const res = await post({ ...flux, prompt: "a dog" });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("IDEMPOTENCY_KEY_REUSED");
  });

  it("five concurrent requests with one key make one job", async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, () => post(flux)),
    );
    expect(results.map((r) => r.status).sort()).toEqual([
      200, 200, 200, 200, 202,
    ]);
    const ids = new Set(results.map((r) => r.body.jobId));
    expect(ids.size).toBe(1);
    expect(await jobCount()).toBe(1);
    expect(await reservedFor([...ids][0]!)).toBe(1);
    const reserved = await testDb(T.creditGrants)
      .where({ user_id: userId })
      .sum({ r: "reserved" })
      .first();
    expect(Number(reserved?.r)).toBe(1);
  });

  it("returns 402 INSUFFICIENT_CREDITS and creates no job when short", async () => {
    const poor = await createFundedUser(h.deps, 1);
    await testDb(T.creditGrants)
      .where({ user_id: poor })
      .update({ used: testDb.raw("total") });
    const res = await post(flux, "k2", poor);
    expect(res.status).toBe(402);
    expect(res.body.code).toBe("INSUFFICIENT_CREDITS");
    expect(await jobCount()).toBe(0);
    expect(h.queue.tasks).toHaveLength(0);
  });

  it("returns 429 TOO_MANY_ACTIVE_JOBS on the fifth active job", async () => {
    for (let i = 0; i < 4; i++) {
      expect((await post(flux, `k${i}`)).status).toBe(202);
    }
    const res = await post(flux, "k4");
    expect(res.status).toBe(429);
    expect(res.body.code).toBe("TOO_MANY_ACTIVE_JOBS");
    expect(await jobCount()).toBe(4);
  });

  it.each([
    ["unknown model", { model: "nope", prompt: "x" }, "k1"],
    ["bad option", { ...flux, options: { num_images: 99 } }, "k1"],
    ["missing prompt", { model: "flux-schnell" }, "k1"],
    ["too many uploads", { ...flux, uploadIds: [randomUUID()] }, "k1"],
    ["missing Idempotency-Key", flux, null],
  ])("422 for %s", async (_name, body, key) => {
    const res = await post(body, key);
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("VALIDATION_FAILED");
    expect(await jobCount()).toBe(0);
  });

  it("rejects an undeclared upload object with 422 UPLOAD_NOT_READY and reserves nothing", async () => {
    const up = await request(createApp(h.deps))
      .post("/v1/uploads")
      .set(await authHeader(userId))
      .send({ filename: "a.png", mimeType: "image/png", sizeBytes: 100 });
    const res = await post({
      model: "kling21",
      prompt: "move",
      uploadIds: [up.body.uploadId],
    });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("UPLOAD_NOT_READY");
    expect(await jobCount()).toBe(0);
    expect(await testDb(T.creditAllocations)).toHaveLength(0);
  });

  it("rejects an upload whose real type the model doesn't accept", async () => {
    const up = await request(createApp(h.deps))
      .post("/v1/uploads")
      .set(await authHeader(userId))
      .send({ filename: "a.png", mimeType: "image/png", sizeBytes: 100 });
    h.storage.put("inputs", up.body.path, {
      sizeBytes: 100,
      mimeType: "image/png",
    });
    // The test config allows png everywhere, so narrow the model instead.
    const model = getModel("kling21")!;
    const original = model.uploads.supportedContentTypes;
    model.uploads.supportedContentTypes = ["image/jpeg"];
    try {
      const res = await post({
        model: "kling21",
        prompt: "move",
        uploadIds: [up.body.uploadId],
      });
      expect(res.status).toBe(422);
      expect(res.body.code).toBe("UPLOAD_NOT_READY");
      expect(res.body.meta).toMatchObject({ reason: "mime_type" });
    } finally {
      model.uploads.supportedContentTypes = original;
    }
    expect(await jobCount()).toBe(0);
  });

  it("still answers 202 when queueing fails, and logs ERROR", async () => {
    h.queue.failNext();
    const res = await post(flux);
    expect(res.status).toBe(202);
    expect(h.logs).toContainEqual(
      expect.objectContaining({ level: "error", jobId: res.body.jobId }),
    );
  });

  it("GET /v1/jobs/:id shows the owner's job without internals; others get 404", async () => {
    const created = await post(flux);
    const app = createApp(h.deps);
    const own = await request(app)
      .get(`/v1/jobs/${created.body.jobId}`)
      .set(await authHeader(userId));
    expect(own.status).toBe(200);
    expect(own.body).toMatchObject({
      jobId: created.body.jobId,
      status: "queued",
      outputs: [],
    });
    expect(JSON.stringify(own.body)).not.toMatch(/bucket|path|fal/i);
    const other = await request(app)
      .get(`/v1/jobs/${created.body.jobId}`)
      .set(await authHeader(randomUUID()));
    expect(other.status).toBe(404);
    expect(other.body.code).toBe("NOT_FOUND");
    const bad = await request(app)
      .get("/v1/jobs/not-a-uuid")
      .set(await authHeader(userId));
    expect(bad.status).toBe(404);
  });
});
