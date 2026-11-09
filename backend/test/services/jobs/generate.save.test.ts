import { beforeEach, describe, expect, it, vi } from "vitest";

// transitionJob is replaced file-wide; each test decides how it behaves.
const control = vi.hoisted(() => ({
  throwTimes: 0,
  forceNull: false,
  writeBeforeThrow: false,
}));
vi.mock("../../../src/db/repositories/jobs.repo.js", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("../../../src/db/repositories/jobs.repo.js")
    >();
  return {
    ...actual,
    transitionJob: async (...args: Parameters<typeof actual.transitionJob>) => {
      const [, , from, patch] = args;
      const isSave =
        from.includes("submitting") && patch.status === "submitted";
      if (isSave && control.throwTimes > 0) {
        control.throwTimes -= 1;
        if (control.writeBeforeThrow) await actual.transitionJob(...args);
        throw new Error("db down");
      }
      if (isSave && control.forceNull) return null;
      return actual.transitionJob(...args);
    },
  };
});

import { jobBody } from "../../helpers/jobs.js";
import { getJob } from "../../../src/db/repositories/jobs.repo.js";
import { T } from "../../../src/db/tables.js";
import { runGenerate } from "../../../src/services/jobs/generate.js";
import { createJob } from "../../../src/services/jobs/jobs.js";
import { makeDeps } from "../../helpers/app.js";
import { seedTestCatalog } from "../../helpers/catalog.js";
import { resetDb, testDb } from "../../helpers/db.js";
import { createFundedUser } from "../../helpers/factories.js";

describe("runGenerate: saving the request id", () => {
  let h: ReturnType<typeof makeDeps>;
  let id: string;
  beforeEach(async () => {
    control.throwTimes = 0;
    control.forceNull = false;
    control.writeBeforeThrow = false;
    await resetDb();
    await seedTestCatalog(testDb);
    h = makeDeps();
    const userId = await createFundedUser(h.deps, 100);
    id = (
      await createJob(
        h.deps,
        userId,
        jobBody("fluxSchnell_generate", {
          prompt: "a cat",
          uploadIds: [],
          options: {},
        }),
        "k1",
      )
    ).job.jobId;
  });

  it("retries saving the request id and succeeds on the third try", async () => {
    control.throwTimes = 2;
    expect(await runGenerate(h.deps, id)).toBe(200);
    expect(await getJob(testDb, id)).toMatchObject({
      status: "submitted",
      fal_request_id: "req_1",
    });
    expect(h.fal.calls.some((c) => c.method === "cancel")).toBe(false);
  });

  it("cancels the fal request when the request id can't be saved", async () => {
    control.throwTimes = 3;
    expect(await runGenerate(h.deps, id)).toBe(503);
    expect(h.fal.calls).toContainEqual({
      method: "cancel",
      args: ["fal-ai/flux/schnell", "req_1"],
    });
    expect(h.logs).toContainEqual(
      expect.objectContaining({
        level: "error",
        message: "couldn't save the fal request id",
        jobId: id,
        requestId: "req_1",
      }),
    );
  });

  it("doesn't cancel when the save threw but the row was written", async () => {
    control.throwTimes = 3;
    control.writeBeforeThrow = true;
    expect(await runGenerate(h.deps, id)).toBe(200);
    expect(h.fal.calls.some((c) => c.method === "cancel")).toBe(false);
  });

  it("doesn't cancel when the webhook already linked our request", async () => {
    control.forceNull = true;
    // The webhook links req_1 while our save finds the job no longer submitting.
    await testDb(T.jobs).where({ id }).update({ fal_request_id: "req_1" });
    expect(await runGenerate(h.deps, id)).toBe(200);
    expect(h.fal.calls.some((c) => c.method === "cancel")).toBe(false);
  });

  it("cancels its own request as a duplicate when another one is linked", async () => {
    control.forceNull = true;
    await testDb(T.jobs).where({ id }).update({ fal_request_id: "req_other" });
    expect(await runGenerate(h.deps, id)).toBe(200);
    expect(h.fal.calls).toContainEqual({
      method: "cancel",
      args: ["fal-ai/flux/schnell", "req_1"],
    });
    expect(h.logs).toContainEqual(
      expect.objectContaining({
        level: "warn",
        jobId: id,
        requestId: "req_1",
        orphanFalRequest: true,
      }),
    );
  });
});
