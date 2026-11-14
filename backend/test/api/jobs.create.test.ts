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
import { canonicalJson, sha256Hex } from "../../src/lib/hash.js";
import { createFundedUser, insertProfile } from "../helpers/factories.js";

const FLUX = "fluxSchnell/generate";
const KLING = "kling21/generate";
const flux = { input: { prompt: "a cat" } };

describe("POST /v1/jobs", () => {
  let h: ReturnType<typeof makeDeps>;
  let userId: string;
  beforeEach(async () => {
    await resetDb();
    await seedTestCatalog(testDb);
    h = makeDeps();
    userId = await createFundedUser(h.deps, 100);
  });

  async function postTo(
    route: string,
    body: unknown,
    key: string | null = "k1",
    uid = userId,
  ) {
    const req = request(createApp(h.deps))
      .post(`/v1/jobs/${route}`)
      .set(await authHeader(uid));
    if (key !== null) req.set("Idempotency-Key", key);
    return req.send(body as object);
  }
  const post = (body: unknown, key: string | null = "k1", uid = userId) =>
    postTo(FLUX, body, key, uid);
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
    const res = await post({ input: { prompt: "a cat", durations: "5" } });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("VALIDATION_FAILED");
    expect(JSON.stringify(res.body)).toContain("durations");
    expect(await jobCount()).toBe(0);
  });

  it.each([
    ["an unknown plugin", "nope/generate"],
    ["an unknown operation", "fluxSchnell/nope"],
    ["a built-in key", "constructor/generate"],
  ])("returns 404 NOT_FOUND for %s", async (_name, route) => {
    const res = await postTo(route, flux);
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("NOT_FOUND");
    expect(await jobCount()).toBe(0);
  });

  it("stores the validated input, defaults filled in", async () => {
    const res = await post(flux);
    const row = await testDb(T.jobs).where({ id: res.body.jobId }).first();
    expect(row.model_key).toBe("fluxSchnell_generate");
    expect(row.input).toEqual({
      prompt: "a cat",
      image_size: "landscape_4_3",
      num_images: 1,
    });
    expect(row.upload_ids).toEqual([]);
  });

  it("rejects more uploads than the image field's maxItems", async () => {
    const res = await postTo(KLING, {
      input: { prompt: "move", image: [randomUUID(), randomUUID()] },
    });
    expect(res.status).toBe(422);
    expect(res.body.meta).toContainEqual(
      expect.objectContaining({ path: ["image"] }),
    );
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
      model: "fluxSchnell_generate",
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
    const b = await post({ input: { prompt: "a cat", num_images: 1 } });
    expect(b.status).toBe(200);
    expect(b.body.jobId).toBe(a.body.jobId);
    expect(await jobCount()).toBe(1);
    expect(await reservedFor(a.body.jobId)).toBe(1);
    expect(h.queue.tasks).toHaveLength(1);
  });

  it("rejects the same key with a different body with 409 IDEMPOTENCY_KEY_REUSED", async () => {
    await post(flux);
    const res = await post({ input: { prompt: "a dog" } });
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
    ["missing input", {}, "k1"],
    ["bad option", { input: { prompt: "a cat", num_images: 99 } }, "k1"],
    ["missing prompt", { input: {} }, "k1"],
    [
      "an upload flux doesn't take",
      { input: { prompt: "a cat", image: [randomUUID()] } },
      "k1",
    ],
    ["missing Idempotency-Key", flux, null],
  ])("422 for %s", async (_name, body, key) => {
    const res = await post(body, key);
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("VALIDATION_FAILED");
    expect(await jobCount()).toBe(0);
  });

  it("rejects a prompt over the model's maxLength, pointing at the prompt", async () => {
    const res = await post({ input: { prompt: "a".repeat(2001) } });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("VALIDATION_FAILED");
    expect(res.body.meta).toContainEqual(
      expect.objectContaining({ path: ["prompt"] }),
    );
    expect(await jobCount()).toBe(0);
  });

  it("accepts a prompt that only the longer model allows", async () => {
    const res = await postTo(KLING, { input: { prompt: "a".repeat(2100) } });
    expect(res.status).toBe(202);
  });

  it("rejects an undeclared upload object with 422 UPLOAD_NOT_READY and reserves nothing", async () => {
    const up = await request(createApp(h.deps))
      .post("/v1/uploads")
      .set(await authHeader(userId))
      .send({ filename: "a.png", mimeType: "image/png", sizeBytes: 100 });
    const res = await postTo(KLING, {
      input: { prompt: "move", image: [up.body.uploadId] },
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
    const model = getModel("kling21_generate")!;
    const original = model.uploads.supportedContentTypes;
    model.uploads.supportedContentTypes = ["image/jpeg"];
    try {
      const res = await postTo(KLING, {
        input: { prompt: "move", image: [up.body.uploadId] },
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

  describe("inside a project", () => {
    async function addProject(owner = userId) {
      const [row] = await testDb(T.projects)
        .insert({
          user_id: owner,
          type: "ai-influencer",
          title: "Mira",
          data: JSON.stringify({ traits: {} }),
        })
        .returning("*");
      return row.id as string;
    }
    async function creditRowCount(): Promise<number> {
      const r = await testDb(T.creditAllocations).count({ n: "*" }).first();
      return Number(r?.n);
    }

    it("saves project_id, returns it and bumps the project's updated_at", async () => {
      const projectId = await addProject();
      const res = await post({ ...flux, projectId });
      expect(res.status).toBe(202);
      expect(res.body.projectId).toBe(projectId);
      const row = await testDb(T.jobs).where({ id: res.body.jobId }).first();
      expect(row.project_id).toBe(projectId);
      const project = await testDb(T.projects).where({ id: projectId }).first();
      expect(project.updated_at).toEqual(h.clock.now());
      expect(await reservedFor(res.body.jobId)).toBe(1);
    });

    it("returns projectId null for a job without a project", async () => {
      const res = await post(flux);
      expect(res.body.projectId).toBeNull();
    });

    it.each([
      ["an unknown project", async () => randomUUID()],
      [
        "another user's project",
        async () => addProject(await insertProfile(testDb)),
      ],
    ])("returns 404 for %s and reserves nothing", async (_name, makeId) => {
      const projectId = await makeId();
      const before = await creditRowCount();
      const res = await post({ ...flux, projectId });
      expect(res.status).toBe(404);
      expect(res.body.code).toBe("NOT_FOUND");
      expect(await jobCount()).toBe(0);
      expect(await creditRowCount()).toBe(before);
    });

    it("rejects a projectId that is not a uuid with 422 and reserves nothing", async () => {
      const before = await creditRowCount();
      const res = await post({ ...flux, projectId: "not-a-uuid" });
      expect(res.status).toBe(422);
      expect(await jobCount()).toBe(0);
      expect(await creditRowCount()).toBe(before);
    });

    it("rejects a video model in an image-only project with 422", async () => {
      const projectId = await addProject();
      const res = await postTo(KLING, {
        input: { prompt: "a cat" },
        projectId,
      });
      expect(res.status).toBe(422);
      expect(res.body.code).toBe("VALIDATION_FAILED");
      expect(await jobCount()).toBe(0);
    });

    it("rejects the same key with a different projectId with 409", async () => {
      const a = await addProject();
      const b = await addProject();
      await post({ ...flux, projectId: a });
      const res = await post({ ...flux, projectId: b });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe("IDEMPOTENCY_KEY_REUSED");
    });

    it("replays a retry with 200 even after the project was deleted", async () => {
      const projectId = await addProject();
      const first = await post({ ...flux, projectId });
      await testDb(T.jobs).where({ project_id: projectId }).update({
        project_id: null,
      });
      await testDb(T.projects).where({ id: projectId }).delete();
      const retry = await post({ ...flux, projectId });
      expect(retry.status).toBe(200);
      expect(retry.body.jobId).toBe(first.body.jobId);
    });

    it("keeps the request hash of a job without a project unchanged", async () => {
      const res = await post(flux);
      const row = await testDb(T.jobs).where({ id: res.body.jobId }).first();
      expect(row.request_hash).toBe(
        sha256Hex(
          canonicalJson({ model: "fluxSchnell_generate", input: row.input }),
        ),
      );
    });
  });
});
