import { beforeEach, describe, expect, it } from "vitest";
import {
  getAddonByName,
  getPlanByName,
} from "../../src/db/repositories/catalog.repo.js";
import { seedCatalog } from "../../src/db/seeds/catalog.js";
import { T } from "../../src/db/tables.js";
import { resetDb, testDb } from "../helpers/db.js";

describe("seedCatalog", () => {
  beforeEach(resetDb);

  it("seeds the sample catalog", async () => {
    await seedCatalog(testDb);
    expect(await getPlanByName(testDb, "pro_yearly")).toMatchObject({
      amount: "300.00",
      interval: "yearly",
      priority: 2,
      credits: 24000,
    });
    expect(await getAddonByName(testDb, "credits_1000")).toMatchObject({
      amount: "20.00",
      duration_days: 30,
      credits: 1000,
    });
  });

  it("is idempotent and keeps Paddle ids", async () => {
    await seedCatalog(testDb);
    await testDb(T.plans)
      .where({ name: "free" })
      .update({ paddle_product_id: "pro_1", paddle_price_id: "pri_1" });
    await seedCatalog(testDb);
    expect(await testDb(T.plans).count()).toEqual([{ count: "4" }]);
    expect(await testDb(T.addons).count()).toEqual([{ count: "1" }]);
    expect(await testDb(T.planFeatures).count()).toEqual([{ count: "4" }]);
    expect(await getPlanByName(testDb, "free")).toMatchObject({
      paddle_product_id: "pro_1",
      paddle_price_id: "pri_1",
      credits: 50,
    });
  });
});
