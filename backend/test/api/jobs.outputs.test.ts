import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/api/server.js";
import { runFinalize } from "../../src/services/jobs/finalize.js";
import { runGenerate } from "../../src/services/jobs/generate.js";
import { createJob } from "../../src/services/jobs/jobs.js";
import { makeDeps } from "../helpers/app.js";
import { authHeader } from "../helpers/auth.js";
import { seedTestCatalog } from "../helpers/catalog.js";
import { resetDb, testDb } from "../helpers/db.js";
import { createFundedUser } from "../helpers/factories.js";

describe("output URLs in the job response", () => {
  let h: ReturnType<typeof makeDeps>;
  let userId: string;
  let jobId: string;
  beforeEach(async () => {
    await resetDb();
    await seedTestCatalog(testDb);
    h = makeDeps();
    userId = await createFundedUser(h.deps, 100);
  });

  async function create(
    model = "flux-schnell",
    options: Record<string, unknown> = {},
  ) {
    const { job } = await createJob(
      h.deps,
      userId,
      { model, prompt: "a cat", uploadIds: [], options },
      "k1",
    );
    jobId = job.jobId;
    return job;
  }
  async function complete(count = 1) {
    await runGenerate(h.deps, jobId);
    h.fal.statuses.set("req_1", "COMPLETED");
    h.fal.results.set("req_1", {
      ok: true,
      data: {
        images: Array.from({ length: count }, (_, i) => ({
          url: `https://fal.media/files/${i}.jpg`,
          content_type: "image/jpeg",
        })),
      },
    });
    await runFinalize(h.deps, jobId);
  }
  async function get(uid = userId) {
    return request(createApp(h.deps))
      .get(`/v1/jobs/${jobId}`)
      .set(await authHeader(uid));
  }
  const expiresAt = () =>
    new Date(h.clock.now().getTime() + 3_600_000).toISOString();

  it("gives a completed job one 1-hour signed URL per output", async () => {
    await create();
    await complete();
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("completed");
    expect(res.body.outputs).toEqual([
      {
        index: 0,
        mimeType: "image/jpeg",
        url: `https://storage.test/outputs/${userId}/${jobId}/0.jpg?mode=read&expires=3600`,
        expiresAt: expiresAt(),
      },
    ]);
  });

  it("signs every output of a multi-image job", async () => {
    await create("flux-schnell", { num_images: 3 });
    await complete(3);
    const res = await get();
    expect(res.body.outputs).toHaveLength(3);
    expect(res.body.outputs.map((o: { url: string }) => o.url)).toEqual(
      [0, 1, 2].map(
        (i) =>
          `https://storage.test/outputs/${userId}/${jobId}/${i}.jpg?mode=read&expires=3600`,
      ),
    );
  });

  it("has no outputs while the job is queued or submitted", async () => {
    await create();
    expect((await get()).body.outputs).toEqual([]);
    await runGenerate(h.deps, jobId);
    const res = await get();
    expect(res.body.status).toBe("submitted");
    expect(res.body.outputs).toEqual([]);
  });

  it("has no outputs on a failed job", async () => {
    await create();
    await runGenerate(h.deps, jobId);
    h.fal.statuses.set("req_1", "COMPLETED");
    h.fal.results.set("req_1", { ok: true, data: { images: [] } });
    await runFinalize(h.deps, jobId);
    const res = await get();
    expect(res.body.status).toBe("failed");
    expect(res.body.outputs).toEqual([]);
  });

  it("returns 404 for another user's job", async () => {
    await create();
    await complete();
    const other = await createFundedUser(h.deps, 10);
    expect((await get(other)).status).toBe(404);
  });

  it("no longer serves GET /v1/jobs/:id/download-url", async () => {
    await create();
    await complete();
    const res = await request(createApp(h.deps))
      .get(`/v1/jobs/${jobId}/download-url`)
      .set(await authHeader(userId));
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Not found");
  });

  it("replaying a completed job's idempotency key returns its URLs", async () => {
    await create();
    await complete();
    const res = await request(createApp(h.deps))
      .post("/v1/jobs")
      .set(await authHeader(userId))
      .set("Idempotency-Key", "k1")
      .send({ model: "flux-schnell", prompt: "a cat" });
    expect(res.status).toBe(200);
    expect(res.body.outputs).toHaveLength(1);
    expect(res.body.outputs[0].url).toContain(`/${jobId}/0.jpg`);
  });

  it("surfaces a Storage signing failure instead of hiding it", async () => {
    await create();
    await complete();
    h.storage.failNext("createSignedUrl");
    const res = await get();
    expect(res.status).toBeGreaterThanOrEqual(500);
    expect((await get()).status).toBe(200);
  });
});
