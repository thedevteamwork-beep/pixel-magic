import { beforeEach, describe, expect, it } from "vitest";
import { jobBody } from "../../helpers/jobs.js";
import { T } from "../../../src/db/tables.js";
import {
  createJob,
  failJob,
  JOB_ERROR_MESSAGES,
} from "../../../src/services/jobs/jobs.js";
import { makeDeps } from "../../helpers/app.js";
import { seedTestCatalog } from "../../helpers/catalog.js";
import { resetDb, testDb } from "../../helpers/db.js";
import { createFundedUser } from "../../helpers/factories.js";

describe("failJob", () => {
  beforeEach(async () => {
    await resetDb();
    await seedTestCatalog(testDb);
  });

  it("fails a job and releases its credits exactly once", async () => {
    const { deps, logs } = makeDeps();
    const userId = await createFundedUser(deps, 100);
    const { job } = await createJob(
      deps,
      userId,
      jobBody("fluxSchnell_generate", {
        prompt: "a cat",
        uploadIds: [],
        options: {},
      }),
      "k1",
    );
    const totals = async () => {
      const r = await testDb(T.creditGrants)
        .where({ user_id: userId })
        .sum({ reserved: "reserved", used: "used" })
        .first();
      return { reserved: Number(r?.reserved), used: Number(r?.used) };
    };
    expect(await totals()).toEqual({ reserved: 1, used: 0 });

    const run = () =>
      testDb.transaction((trx) =>
        failJob(
          trx,
          deps,
          job.jobId,
          ["queued"],
          "SUBMIT_FAILED",
          "secret-detail-xyz",
        ),
      );
    expect(await run()).toBe(true);
    expect(await run()).toBe(false);

    expect(await totals()).toEqual({ reserved: 0, used: 0 });
    const row = await testDb(T.jobs).where({ id: job.jobId }).first();
    expect(row).toMatchObject({
      status: "failed",
      error_code: "SUBMIT_FAILED",
      lease_expires_at: null,
    });
    expect(row.error_message).toBe(JOB_ERROR_MESSAGES.SUBMIT_FAILED);
    expect(row.error_message).not.toContain("secret-detail-xyz");
    expect(row.completed_at).toEqual(deps.clock.now());
    const releases = await testDb(T.creditLedger).where({
      job_id: job.jobId,
      type: "release",
    });
    expect(releases).toHaveLength(1);
    expect(logs).toContainEqual(
      expect.objectContaining({
        level: "warn",
        jobId: job.jobId,
        code: "SUBMIT_FAILED",
        from: ["queued"],
        to: "failed",
        message: "Job failed",
        detail: "secret-detail-xyz",
      }),
    );
  });
});
