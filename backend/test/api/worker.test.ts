import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createWorkerApp } from "../../src/worker/server.js";
import { makeDeps } from "../helpers/app.js";
import { seedTestCatalog } from "../helpers/catalog.js";
import { resetDb, testDb } from "../helpers/db.js";

describe("worker", () => {
  beforeEach(async () => {
    await resetDb();
    await seedTestCatalog(testDb);
  });

  it("POST /tasks/billing-sweep returns the counts", async () => {
    const { deps } = makeDeps();
    const res = await request(createWorkerApp(deps)).post(
      "/tasks/billing-sweep",
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      freeRenewed: 0,
      cancelsRetried: 0,
      cancelsCleared: 0,
      draftsExpired: 0,
      stuck: 0,
    });
  });
});
