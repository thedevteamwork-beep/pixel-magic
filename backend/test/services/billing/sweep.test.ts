import { beforeEach, describe, expect, it } from "vitest";
import { insertDraftInvoice } from "../../../src/db/repositories/invoices.repo.js";
import type { PlanWithCredits } from "../../../src/db/rows.js";
import { T } from "../../../src/db/tables.js";
import type { Deps } from "../../../src/deps.js";
import { runBillingSweep } from "../../../src/services/billing/sweep.js";
import { FakePaddle } from "../../fakes/paddle.js";
import { makeDeps, type TestClock } from "../../helpers/app.js";
import { seedTestCatalog } from "../../helpers/catalog.js";
import { resetDb, testDb } from "../../helpers/db.js";
import {
  createUserOnPlan,
  insertProfile,
  insertSubscriptionRow,
} from "../../helpers/factories.js";

const t0 = new Date("2026-03-10T12:00:00Z");
const hour = 3_600_000;
const day = 24 * hour;

describe("runBillingSweep", () => {
  let deps: Deps;
  let paddle: FakePaddle;
  let clock: TestClock;
  let logs: Array<Record<string, unknown>>;
  let plans: Record<string, PlanWithCredits>;

  beforeEach(async () => {
    await resetDb();
    ({ plans } = await seedTestCatalog(testDb));
    ({ deps, paddle, clock, logs } = makeDeps());
    clock.set(t0);
  });

  const errors = () => logs.filter((l) => l.severity === "ERROR");

  const subsOf = (userId: string) =>
    testDb(T.subscriptions).where("user_id", userId).orderBy("created_at");

  const pendingCancelRow = async (canceledAt: Date, paddleId = "sub_old") => {
    const userId = await insertProfile(testDb);
    paddle.subscriptions.set(paddleId, {
      id: paddleId,
      status: "active",
      priceId: null,
      periodEnd: null,
      scheduledChange: null,
    });
    return insertSubscriptionRow(testDb, {
      user_id: userId,
      plan_id: plans.starter_monthly.id,
      status: "upgraded",
      canceled_at: canceledAt,
      paddle_subscription_id: paddleId,
      paddle_cancel_pending: true,
    });
  };

  it("renews expired Free rows once with a fresh grant", async () => {
    const { userId } = await createUserOnPlan(deps, {
      planName: "free",
      periodStart: new Date(t0.getTime() - 31 * day),
      periodEnd: new Date(t0.getTime() - hour),
    });
    const first = await runBillingSweep(deps);
    const second = await runBillingSweep(deps);
    expect(first.freeRenewed).toBe(1);
    expect(second.freeRenewed).toBe(0);
    const rows = await subsOf(userId);
    expect(rows).toHaveLength(2);
    expect(rows[0].status).toBe("renewed");
    expect(rows[1].active).toBe(true);
    expect(rows[1].current_period_start).toEqual(t0);
    expect(rows[1].current_period_end).toEqual(
      new Date("2026-04-10T12:00:00Z"),
    );
    const grants = await testDb(T.creditGrants).where(
      "subscription_id",
      rows[1].id,
    );
    expect(grants).toHaveLength(1);
  });

  it("leaves unexpired Free rows alone", async () => {
    const { userId } = await createUserOnPlan(deps, {
      planName: "free",
      periodStart: t0,
      periodEnd: new Date(t0.getTime() + hour),
    });
    const counts = await runBillingSweep(deps);
    expect(counts.freeRenewed).toBe(0);
    expect(await subsOf(userId)).toHaveLength(1);
  });

  it("never closes a paid row whose period ended", async () => {
    const { userId } = await createUserOnPlan(deps, {
      planName: "starter_monthly",
      periodStart: new Date(t0.getTime() - 40 * day),
      periodEnd: new Date(t0.getTime() - 10 * day),
    });
    const counts = await runBillingSweep(deps);
    expect(counts.freeRenewed).toBe(0);
    const rows = await subsOf(userId);
    expect(rows).toHaveLength(1);
    expect(rows[0].active).toBe(true);
  });

  it("retries a pending cancel and clears the flag", async () => {
    const row = await pendingCancelRow(new Date(t0.getTime() - hour));
    const counts = await runBillingSweep(deps);
    expect(counts.cancelsRetried).toBe(1);
    expect(counts.cancelsCleared).toBe(1);
    expect(paddle.callsTo("cancelSubscription")[0].args).toEqual([
      "sub_old",
      "immediately",
    ]);
    const after = await testDb(T.subscriptions).where("id", row.id).first();
    expect(after.paddle_cancel_pending).toBe(false);
  });

  it("keeps the flag on failure and logs ERROR after 24 h", async () => {
    const row = await pendingCancelRow(new Date(t0.getTime() - 25 * hour));
    paddle.failNext("cancelSubscription");
    const counts = await runBillingSweep(deps);
    expect(counts.cancelsRetried).toBe(1);
    expect(counts.cancelsCleared).toBe(0);
    const after = await testDb(T.subscriptions).where("id", row.id).first();
    expect(after.paddle_cancel_pending).toBe(true);
    expect(errors().some((l) => JSON.stringify(l).includes(row.id))).toBe(true);
  });

  it("does not log ERROR for a failing cancel younger than 24 h", async () => {
    await pendingCancelRow(new Date(t0.getTime() - 23 * hour));
    paddle.failNext("cancelSubscription");
    await runBillingSweep(deps);
    expect(errors()).toHaveLength(0);
  });

  it("clears the flag when Paddle already shows the subscription canceled", async () => {
    const row = await pendingCancelRow(new Date(t0.getTime() - hour));
    paddle.subscriptions.set("sub_old", {
      ...paddle.subscriptions.get("sub_old")!,
      status: "canceled",
    });
    const counts = await runBillingSweep(deps);
    expect(counts.cancelsCleared).toBe(1);
    expect(paddle.callsTo("cancelSubscription")).toHaveLength(0);
    const after = await testDb(T.subscriptions).where("id", row.id).first();
    expect(after.paddle_cancel_pending).toBe(false);
  });

  it("removes a scheduled change before cancelling", async () => {
    await pendingCancelRow(new Date(t0.getTime() - hour));
    paddle.subscriptions.set("sub_old", {
      ...paddle.subscriptions.get("sub_old")!,
      scheduledChange: {
        action: "cancel",
        effectiveAt: new Date(t0.getTime() + day),
      },
    });
    const counts = await runBillingSweep(deps);
    expect(counts.cancelsCleared).toBe(1);
    const order = paddle.calls.map((c) => c.method);
    expect(order.indexOf("removeScheduledChange")).toBeGreaterThan(-1);
    expect(order.indexOf("removeScheduledChange")).toBeLessThan(
      order.indexOf("cancelSubscription"),
    );
  });

  it("cancels drafts older than 24 h only", async () => {
    const userId = await insertProfile(testDb);
    const draft = (age: number) =>
      insertDraftInvoice(testDb, {
        user_id: userId,
        item_type: "plan",
        item_id: plans.starter_monthly.id,
        change_type: "new",
        from_subscription_id: null,
        amount: "10.00",
        currency: "USD",
        created_at: new Date(t0.getTime() - age),
      });
    const old = await draft(25 * hour);
    const fresh = await draft(23 * hour);
    const counts = await runBillingSweep(deps);
    expect(counts.draftsExpired).toBe(1);
    const status = async (id: string) =>
      (await testDb(T.invoices).where("id", id).first()).status;
    expect(await status(old.id)).toBe("canceled");
    expect(await status(fresh.id)).toBe("draft");
  });

  it("logs stuck paid rows and paused rows at ERROR", async () => {
    const stuck = await createUserOnPlan(deps, {
      planName: "starter_monthly",
      paddleSubscriptionId: "sub_a",
      periodStart: new Date(t0.getTime() - 38 * day),
      periodEnd: new Date(t0.getTime() - 8 * day),
    });
    const recent = await createUserOnPlan(deps, {
      planName: "starter_monthly",
      paddleSubscriptionId: "sub_b",
      periodStart: new Date(t0.getTime() - 36 * day),
      periodEnd: new Date(t0.getTime() - 6 * day),
    });
    const paused = await createUserOnPlan(deps, {
      planName: "starter_monthly",
      paddleSubscriptionId: "sub_c",
      periodStart: t0,
      periodEnd: new Date(t0.getTime() + 30 * day),
    });
    await testDb(T.subscriptions)
      .where("id", paused.sub.id)
      .update({ paddle_status: "paused" });
    const counts = await runBillingSweep(deps);
    expect(counts.stuck).toBe(2);
    const logged = JSON.stringify(errors());
    expect(logged).toContain(stuck.sub.id);
    expect(logged).toContain(paused.sub.id);
    expect(logged).not.toContain(recent.sub.id);
    expect((await subsOf(stuck.userId))[0].active).toBe(true);
  });
});
