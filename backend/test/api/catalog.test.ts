import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/api/server.js";
import { makeDeps } from "../helpers/app.js";
import { seedTestCatalog } from "../helpers/catalog.js";
import { resetDb, testDb } from "../helpers/db.js";

describe("catalog routes", () => {
  beforeEach(async () => {
    await resetDb();
    await seedTestCatalog(testDb);
  });

  it("GET /v1/plans lists public plans in tier order with credits", async () => {
    const res = await request(createApp(makeDeps().deps)).get("/v1/plans");
    expect(res.status).toBe(200);
    expect(res.body.map((p: { name: string }) => p.name)).toEqual([
      "free",
      "starter_monthly",
      "starter_yearly",
      "pro_monthly",
      "pro_monthly_v2",
      "pro_monthly_v3",
      "pro_yearly",
    ]);
    expect(res.body[0]).toEqual({
      name: "free",
      display: "Free",
      description: expect.any(String),
      interval: "monthly",
      amount: "0.00",
      currency: "USD",
      credits: 50,
      creditValidityDays: null,
      priority: 0,
    });
  });

  it("GET /v1/addons hides archived add-ons", async () => {
    const res = await request(createApp(makeDeps().deps)).get("/v1/addons");
    expect(res.status).toBe(200);
    const names = res.body.map((a: { name: string }) => a.name);
    expect(names).toContain("credits_1000");
    expect(names).not.toContain("archived_addon");
    expect(
      res.body.find((a: { name: string }) => a.name === "credits_1000"),
    ).toMatchObject({ durationDays: 30, credits: 1000, amount: "20.00" });
  });

  it("sets Cache-Control public, max-age=300", async () => {
    const app = createApp(makeDeps().deps);
    for (const path of ["/v1/plans", "/v1/addons"]) {
      const res = await request(app).get(path);
      expect(res.headers["cache-control"]).toBe("public, max-age=300");
    }
  });
});
