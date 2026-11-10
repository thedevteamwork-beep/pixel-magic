import { beforeEach, describe, expect, it } from "vitest";
import { T } from "../../../src/db/tables.js";
import { ensurePaddlePrice } from "../../../src/services/billing/checkout.js";
import { makeDeps } from "../../helpers/app.js";
import { seedTestCatalog } from "../../helpers/catalog.js";
import { resetDb, testDb } from "../../helpers/db.js";

describe("ensurePaddlePrice", () => {
  beforeEach(async () => {
    await resetDb();
    await seedTestCatalog(testDb);
  });

  it("concurrent first purchases create one Paddle price", async () => {
    const { deps, paddle } = makeDeps();
    paddle.delay(50);
    const addon = await testDb(T.addons).where("name", "credits_1000").first();
    const ids = await Promise.all([
      ensurePaddlePrice(deps, "addon", addon.id),
      ensurePaddlePrice(deps, "addon", addon.id),
    ]);
    expect(ids).toEqual(["pri_1", "pri_1"]);
    expect(paddle.callsTo("createPrice")).toHaveLength(1);
    expect(paddle.callsTo("createProduct")).toHaveLength(1);
  });

  it("a plan price is recurring", async () => {
    const { deps, paddle } = makeDeps();
    const plan = await testDb(T.plans).where("name", "pro_yearly").first();
    await ensurePaddlePrice(deps, "plan", plan.id);
    expect(paddle.callsTo("createProduct")[0]!.args[0]).toMatchObject({
      customData: { itemId: plan.id, itemType: "plan" },
    });
    expect(paddle.callsTo("createPrice")[0]!.args[0]).toMatchObject({
      interval: "year",
      amountCents: "30000",
    });
  });
});
