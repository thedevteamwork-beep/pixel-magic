import { randomUUID } from "node:crypto";
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

describe("GET /v1/jobs/:id/download-url", () => {
  let h: ReturnType<typeof makeDeps>;
  let userId: string;
  let jobId: string;
  beforeEach(async () => {
    await resetDb();
    await seedTestCatalog(testDb);
    h = makeDeps();
    userId = await createFundedUser(h.deps, 100);
    const { job } = await createJob(
      h.deps,
      userId,
      { model: "flux-schnell", prompt: "a cat", uploadIds: [], options: {} },
      "k1",
    );
    jobId = job.jobId;
    await runGenerate(h.deps, jobId);
  });
  async function complete() {
    h.fal.statuses.set("req_1", "COMPLETED");
    h.fal.results.set("req_1", {
      ok: true,
      data: {
        images: [
          { url: "https://fal.media/files/a.jpg", content_type: "image/jpeg" },
        ],
      },
    });
    await runFinalize(h.deps, jobId);
  }
  async function get(query = "", uid = userId) {
    return request(createApp(h.deps))
      .get(`/v1/jobs/${jobId}/download-url${query}`)
      .set(await authHeader(uid));
  }

  it("gives the owner a 1-hour signed URL", async () => {
    await complete();
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      url: `https://storage.test/outputs/${userId}/${jobId}/0.jpg?mode=read&expires=3600`,
      expiresAt: new Date(h.clock.now().getTime() + 3_600_000).toISOString(),
    });
  });

  it("returns 409 JOB_NOT_COMPLETED before completion", async () => {
    const res = await get();
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("JOB_NOT_COMPLETED");
  });

  it("returns 404 for another user or an index out of range", async () => {
    await complete();
    const other = await createFundedUser(h.deps, 10);
    expect((await get("", other)).status).toBe(404);
    expect((await get("?index=1")).status).toBe(404);
    expect((await get("", randomUUID())).status).toBe(404);
  });

  it("rejects a negative index", async () => {
    await complete();
    expect((await get("?index=-1")).status).toBe(422);
  });
});
