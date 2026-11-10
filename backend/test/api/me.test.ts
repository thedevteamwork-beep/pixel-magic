import { randomUUID } from "node:crypto";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/api/server.js";
import { T } from "../../src/db/tables.js";
import { makeDeps } from "../helpers/app.js";
import { authHeader } from "../helpers/auth.js";
import { seedTestCatalog } from "../helpers/catalog.js";
import { resetDb, testDb } from "../helpers/db.js";

describe("GET /v1/me", () => {
  let userId: string;
  beforeEach(async () => {
    await resetDb();
    await seedTestCatalog(testDb);
    userId = randomUUID();
  });

  it("first call creates the profile, a Free subscription and its grant", async () => {
    const app = createApp(makeDeps().deps);
    const res = await request(app)
      .get("/v1/me")
      .set(await authHeader(userId));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      userId,
      email: "u@test.dev",
      credits: {
        available: 50,
        reserved: 0,
        grants: [
          {
            kind: "plan",
            remaining: 50,
            expiresAt: "2026-04-10T13:00:00.000Z",
          },
        ],
      },
      subscription: {
        plan: "free",
        display: "Free",
        interval: "monthly",
        status: "active",
        currentPeriodEnd: "2026-04-10T12:00:00.000Z",
        nextPlan: null,
        paddleStatus: null,
      },
    });
  });

  it("five concurrent first calls create one Free subscription and one grant", async () => {
    const app = createApp(makeDeps().deps);
    const headers = await authHeader(userId);
    const results = await Promise.all(
      Array.from({ length: 5 }, () => request(app).get("/v1/me").set(headers)),
    );
    expect(results.map((r) => r.status)).toEqual([200, 200, 200, 200, 200]);
    expect(await testDb(T.subscriptions).where("user_id", userId)).toHaveLength(
      1,
    );
    expect(await testDb(T.creditGrants).where("user_id", userId)).toHaveLength(
      1,
    );
  });

  it("a token without email creates the profile with email null", async () => {
    const app = createApp(makeDeps().deps);
    const res = await request(app)
      .get("/v1/me")
      .set(await authHeader(userId, { email: null }));
    expect(res.status).toBe(200);
    expect(res.body.email).toBeNull();
    const profile = await testDb(T.profiles).where("id", userId).first();
    expect(profile.email).toBeNull();
  });

  it("reports a scheduled plan change as nextPlan", async () => {
    const { deps } = makeDeps();
    const app = createApp(deps);
    await request(app)
      .get("/v1/me")
      .set(await authHeader(userId));
    const starter = await testDb(T.plans)
      .where("name", "starter_monthly")
      .first("id");
    await testDb(T.subscriptions)
      .where("user_id", userId)
      .update({ next_plan_id: starter.id });
    const res = await request(app)
      .get("/v1/me")
      .set(await authHeader(userId));
    expect(res.body.subscription.nextPlan).toBe("starter_monthly");
  });

  it("returns 500 INTERNAL and logs when the Free plan is missing", async () => {
    await testDb(T.planFeatures).del();
    await testDb(T.plans).where("name", "free").del();
    const { deps, logs } = makeDeps();
    const res = await request(createApp(deps))
      .get("/v1/me")
      .set(await authHeader(userId));
    expect(res.status).toBe(500);
    expect(res.body.code).toBe("INTERNAL");
    expect(JSON.stringify(logs)).toContain("Free plan missing");
  });
});
