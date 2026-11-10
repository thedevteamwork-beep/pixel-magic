import { beforeEach, describe, expect, it } from "vitest";
import {
  getAddonByName,
  getPlanByName,
} from "../../src/db/repositories/catalog.repo.js";
import { CATALOG, seedCatalog } from "../../src/db/seeds/catalog.js";
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

  const NOW = new Date("2026-03-10T12:00:00Z");

  function withPlan(name: string, change: Record<string, unknown>) {
    return {
      ...CATALOG,
      plans: CATALOG.plans.map((p) =>
        p.name === name ? { ...p, ...change } : p,
      ),
    };
  }

  async function registerOnPaddle(table: string, name: string) {
    await testDb(table)
      .where({ name })
      .update({
        paddle_product_id: `pro_${name}`,
        paddle_price_id: `pri_${name}`,
      });
  }

  it.each([
    ["amount", { amount: "12.00" }],
    ["currency", { currency: "EUR" }],
    ["interval", { interval: "yearly" }],
  ])(
    "refuses to change a Paddle-registered plan's %s",
    async (_field, change) => {
      await seedCatalog(testDb, NOW);
      await registerOnPaddle(T.plans, "starter_monthly");
      await expect(
        seedCatalog(testDb, NOW, withPlan("starter_monthly", change)),
      ).rejects.toThrow(
        "Price change for starter_monthly needs a new catalog row; archive the old one",
      );
      expect(await getPlanByName(testDb, "starter_monthly")).toMatchObject({
        amount: "10.00",
        currency: "USD",
        interval: "monthly",
      });
    },
  );

  it("still merges other fields of a Paddle-registered plan at the same price", async () => {
    await seedCatalog(testDb, NOW);
    await registerOnPaddle(T.plans, "starter_monthly");
    await seedCatalog(
      testDb,
      NOW,
      withPlan("starter_monthly", {
        amount: "10",
        description: "New copy",
        credits: 600,
      }),
    );
    expect(await getPlanByName(testDb, "starter_monthly")).toMatchObject({
      amount: "10.00",
      description: "New copy",
      credits: 600,
      paddle_price_id: "pri_starter_monthly",
    });
  });

  it("re-prices a plan that is not registered on Paddle yet", async () => {
    await seedCatalog(testDb, NOW);
    await seedCatalog(
      testDb,
      NOW,
      withPlan("starter_monthly", { amount: "12.00" }),
    );
    expect((await getPlanByName(testDb, "starter_monthly"))!.amount).toBe(
      "12.00",
    );
  });

  it("refuses to re-price a Paddle-registered add-on", async () => {
    await seedCatalog(testDb, NOW);
    await registerOnPaddle(T.addons, "credits_1000");
    const repriced = {
      ...CATALOG,
      addons: CATALOG.addons.map((a) => ({ ...a, amount: "25.00" })),
    };
    await expect(seedCatalog(testDb, NOW, repriced)).rejects.toThrow(
      "Price change for credits_1000 needs a new catalog row; archive the old one",
    );
    expect((await getAddonByName(testDb, "credits_1000"))!.amount).toBe(
      "20.00",
    );
  });
});
