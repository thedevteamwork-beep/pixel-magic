import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  insertProject,
  unlinkProjectJobs,
} from "../../src/db/repositories/projects.repo.js";
import { T } from "../../src/db/tables.js";
import { resetDb, testDb } from "../helpers/db.js";
import { insertJob, insertProfile } from "../helpers/factories.js";

beforeEach(resetDb);
afterAll(() => testDb.destroy());

describe("unlinkProjectJobs", () => {
  it("unlinks only the given user's jobs", async () => {
    const owner = await insertProfile(testDb);
    const other = await insertProfile(testDb);
    const project = await insertProject(testDb, {
      user_id: owner,
      type: "ai-influencer",
      title: "Mira",
      data: { traits: {} },
      now: new Date("2026-11-14T00:00:00Z"),
    });
    const job = await insertJob(testDb, owner);
    await testDb(T.jobs).where("id", job.id).update({ project_id: project.id });
    const projectOf = async () =>
      (await testDb(T.jobs).where("id", job.id).first()).project_id;

    await testDb.transaction((trx) =>
      unlinkProjectJobs(trx, other, project.id),
    );
    expect(await projectOf()).toBe(project.id);

    await testDb.transaction((trx) =>
      unlinkProjectJobs(trx, owner, project.id),
    );
    expect(await projectOf()).toBeNull();
  });
});
