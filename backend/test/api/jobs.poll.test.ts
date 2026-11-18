import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/api/server.js";
import { FalError } from "../../src/clients/fal.js";
import { getJob } from "../../src/db/repositories/jobs.repo.js";
import { T } from "../../src/db/tables.js";
import { FAL_CHECK_INTERVAL_MS } from "../../src/services/jobs/checkJob.js";
import { runGenerate } from "../../src/services/jobs/generate.js";
import { createJob } from "../../src/services/jobs/jobs.js";
import { makeDeps } from "../helpers/app.js";
import { authHeader } from "../helpers/auth.js";
import { seedTestCatalog } from "../helpers/catalog.js";
import { resetDb, testDb } from "../helpers/db.js";
import { createFundedUser } from "../helpers/factories.js";
import { jobBody } from "../helpers/jobs.js";

/** The app's polling of GET /v1/jobs/:id drives a job fal is working on toward finalize. */
describe("GET /v1/jobs/:id while fal works", () => {
  let h: ReturnType<typeof makeDeps>;
  let userId: string;
  let jobId: string;
  let requestId: string;

  beforeEach(async () => {
    await resetDb();
    await seedTestCatalog(testDb);
    h = makeDeps();
    userId = await createFundedUser(h.deps, 100);
    ({
      job: { jobId },
    } = await createJob(
      h.deps,
      userId,
      jobBody("fluxSchnell_generate", { prompt: "a cat" }),
      "poll-1",
    ));
    expect(await runGenerate(h.deps, jobId)).toBe(200);
    requestId = (await getJob(testDb, jobId))!.fal_request_id!;
    h.fal.calls.length = 0;
    h.queue.tasks.length = 0;
  });

  const poll = async () =>
    request(createApp(h.deps))
      .get(`/v1/jobs/${jobId}`)
      .set(await authHeader(userId));
  const statusChecks = () =>
    h.fal.calls.filter((c) => c.method === "status").length;

  it("queues the finalize once fal reports the job complete", async () => {
    h.clock.advance(FAL_CHECK_INTERVAL_MS);
    h.fal.statuses.set(requestId, "IN_PROGRESS");
    expect((await poll()).body.status).toBe("submitted");
    expect(h.queue.tasks).toEqual([]);

    h.clock.advance(FAL_CHECK_INTERVAL_MS);
    h.fal.statuses.set(requestId, "COMPLETED");
    expect((await poll()).status).toBe(200);
    expect(h.queue.tasks).toMatchObject([
      { kind: "finalize", jobId, suffix: "0" },
    ]);
  });

  it("asks fal at most once per interval, however often the app polls", async () => {
    await poll();
    expect(statusChecks()).toBe(0);
    h.clock.advance(FAL_CHECK_INTERVAL_MS);
    await poll();
    await poll();
    await poll();
    expect(statusChecks()).toBe(1);
  });

  it("still answers when fal can't be reached, and asks again next time", async () => {
    h.clock.advance(FAL_CHECK_INTERVAL_MS);
    h.fal.failNext("status", new FalError("fal down", true, 503));
    const res = await poll();
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("submitted");
    expect(h.logs.some((l) => l.level === "warn" && l.jobId === jobId)).toBe(
      true,
    );
    h.fal.statuses.set(requestId, "COMPLETED");
    await poll();
    expect(h.queue.tasks).toMatchObject([{ kind: "finalize", jobId }]);
  });

  it("leaves jobs fal is not working on alone", async () => {
    await testDb(T.jobs).where({ id: jobId }).update({ status: "completed" });
    h.clock.advance(FAL_CHECK_INTERVAL_MS);
    await poll();
    expect(statusChecks()).toBe(0);
  });
});
