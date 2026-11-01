import { beforeEach, describe, expect, it } from "vitest";
import { getActiveSubscription } from "../../../src/db/repositories/subscriptions.repo.js";
import type {
  ActiveSubscription,
  GrantRow,
  PlanWithCredits,
} from "../../../src/db/rows.js";
import { T } from "../../../src/db/tables.js";
import type { Deps } from "../../../src/deps.js";
import {
  moveToPlan,
  StaleSubscriptionError,
  type MoveParams,
} from "../../../src/services/billing/subscriptions.js";
import { makeDeps } from "../../helpers/app.js";
import { seedTestCatalog } from "../../helpers/catalog.js";
import { resetDb, testDb } from "../../helpers/db.js";
import { createUserOnPlan } from "../../helpers/factories.js";

const t0 = new Date("2026-03-10T12:00:00Z");
const t = new Date("2026-03-20T12:00:00Z");
const day = 86_400_000;

describe("moveToPlan", () => {
  let deps: Deps;
  let plans: Record<string, PlanWithCredits>;
  beforeEach(async () => {
    await resetDb();
    ({ plans } = await seedTestCatalog(testDb));
    deps = makeDeps().deps;
  });

  const move = (p: Partial<MoveParams> & Pick<MoveParams, "from" | "toPlan">) =>
    testDb.transaction((trx) =>
      moveToPlan(trx, deps, {
        status: "upgraded",
        t,
        periodStart: t,
        periodEnd: new Date(t.getTime() + 30 * day),
        paddleSubscriptionId: null,
        invoiceId: null,
        paddleCancelPending: false,
        ...p,
      }),
    );

  const userOn = (planName: string, paddleSubscriptionId?: string) =>
    createUserOnPlan(deps, {
      planName,
      periodStart: t0,
      periodEnd: new Date(t0.getTime() + 30 * day),
      paddleSubscriptionId,
    });

  const grantsOf = (userId: string): Promise<GrantRow[]> =>
    testDb(T.creditGrants).where("user_id", userId).orderBy("created_at");

  it("moveToPlan upgraded from a paid plan converts leftovers to carryover", async () => {
    const { userId, sub } = await userOn("starter_monthly");
    const [old] = await grantsOf(userId);
    const next = await move({ from: sub, toPlan: plans.pro_monthly });
    const grants = await testDb(T.creditGrants)
      .where("user_id", userId)
      .orderBy("starts_at");
    const converted = grants.find((g: GrantRow) => g.id === old.id)!;
    expect(converted.kind).toBe("carryover");
    expect(converted.expires_at).toEqual(
      new Date(Math.max(old.expires_at.getTime(), t.getTime() + 30 * day)),
    );
    expect(next.active).toBe(true);
    expect(next.plan_id).toBe(plans.pro_monthly.id);
    expect(next.previous_subscription_id).toBe(sub.id);
    const fresh = grants.find((g: GrantRow) => g.subscription_id === next.id)!;
    expect(fresh.kind).toBe("plan");
    expect(fresh.total).toBe(plans.pro_monthly.credits);
    expect(fresh.starts_at).toEqual(t);
    const closed = await testDb(T.subscriptions).where("id", sub.id).first();
    expect(closed.status).toBe("upgraded");
    expect(closed.active).toBe(false);
  });

  it("moveToPlan from Free ends the Free grant at t", async () => {
    const { userId, sub } = await userOn("free");
    await move({ from: sub, toPlan: plans.starter_monthly });
    const free = (await grantsOf(userId)).find(
      (g) => g.subscription_id === sub.id,
    )!;
    expect(free.kind).toBe("plan");
    expect(free.expires_at).toEqual(t);
  });

  for (const status of ["renewed", "canceled"] as const) {
    it(`moveToPlan ${status} keeps the old grant untouched`, async () => {
      const { userId, sub } = await userOn("starter_monthly");
      const [before] = await grantsOf(userId);
      await move({
        from: sub,
        toPlan: status === "renewed" ? plans.starter_monthly : plans.free,
        status,
      });
      const after = (await grantsOf(userId)).find((g) => g.id === before.id)!;
      expect(after.kind).toBe("plan");
      expect(after.expires_at).toEqual(before.expires_at);
    });
  }

  it("moveToPlan sets paddle_cancel_pending on the closed row when asked", async () => {
    const { sub } = await userOn("starter_monthly", "sub_1");
    await move({
      from: sub,
      toPlan: plans.pro_monthly,
      paddleSubscriptionId: "sub_2",
      paddleCancelPending: true,
    });
    const closed = await testDb(T.subscriptions).where("id", sub.id).first();
    expect(closed.paddle_cancel_pending).toBe(true);
  });

  it("the new row inherits last_event_occurred_at and paddle_status on the same Paddle subscription", async () => {
    const { userId, sub } = await userOn("starter_monthly", "sub_1");
    const eventAt = new Date("2026-03-15T00:00:00Z");
    await testDb(T.subscriptions)
      .where("id", sub.id)
      .update({ last_event_occurred_at: eventAt, paddle_status: "active" });
    const from = (await getActiveSubscription(
      testDb,
      userId,
    )) as ActiveSubscription;
    const same = await move({
      from,
      toPlan: plans.pro_monthly,
      paddleSubscriptionId: "sub_1",
    });
    expect(same.last_event_occurred_at).toEqual(eventAt);
    expect(same.paddle_status).toBe("active");

    const other = await move({
      from: (await getActiveSubscription(testDb, userId))!,
      toPlan: plans.starter_monthly,
      status: "downgraded",
      paddleSubscriptionId: "sub_9",
    });
    expect(other.last_event_occurred_at).toBeNull();
    expect(other.paddle_status).toBeNull();
  });

  it("the closed row's current_period_end is cut to t, never extended", async () => {
    const early = await userOn("starter_monthly");
    await move({ from: early.sub, toPlan: plans.pro_monthly });
    const cut = await testDb(T.subscriptions).where("id", early.sub.id).first();
    expect(cut.current_period_end).toEqual(t);

    const late = await userOn("starter_monthly");
    const lateT = new Date(t0.getTime() + 40 * day); // after the period end
    const next = await move({
      from: late.sub,
      toPlan: plans.pro_monthly,
      status: "renewed",
      t: lateT,
      periodStart: lateT,
      periodEnd: new Date(lateT.getTime() + 30 * day),
    });
    expect(next.previous_subscription_id).toBe(late.sub.id);
    const kept = await testDb(T.subscriptions).where("id", late.sub.id).first();
    expect(kept.current_period_end).toEqual(late.sub.current_period_end);
  });

  it("moveToPlan on an already-closed from throws StaleSubscriptionError and changes nothing", async () => {
    const { userId, sub } = await userOn("free");
    await move({ from: sub, toPlan: plans.starter_monthly });
    const subsBefore = await testDb(T.subscriptions).orderBy("id");
    const grantsBefore = await testDb(T.creditGrants).orderBy("id");
    await expect(
      move({
        from: sub,
        toPlan: plans.pro_monthly,
        t: new Date(t.getTime() + day),
      }),
    ).rejects.toBeInstanceOf(StaleSubscriptionError);
    expect(await testDb(T.subscriptions).orderBy("id")).toEqual(subsBefore);
    expect(await testDb(T.creditGrants).orderBy("id")).toEqual(grantsBefore);
    expect(await grantsOf(userId)).toHaveLength(2);
  });

  it("moveToPlan inherits Paddle state from the DB row, not the from snapshot", async () => {
    const { userId, sub } = await userOn("starter_monthly", "sub_1");
    const eventAt = new Date("2026-03-16T00:00:00Z");
    await testDb(T.subscriptions)
      .where("id", sub.id)
      .update({ last_event_occurred_at: eventAt, paddle_status: "active" });
    const next = await move({
      from: sub, // stale: still has null paddle_status
      toPlan: plans.pro_monthly,
      paddleSubscriptionId: "sub_1",
    });
    expect(next.last_event_occurred_at).toEqual(eventAt);
    expect(next.paddle_status).toBe("active");
    expect(next.user_id).toBe(userId);
  });

  it("moveToPlan renewed from Free keeps the old Free grant untouched", async () => {
    const { userId, sub } = await userOn("free");
    const [before] = await grantsOf(userId);
    await move({ from: sub, toPlan: plans.free, status: "renewed" });
    const after = (await grantsOf(userId)).find((g) => g.id === before.id)!;
    expect(after.expires_at).toEqual(before.expires_at);
    expect(after.kind).toBe("plan");
  });

  it("moveToPlan downgraded from a paid plan converts leftovers to carryover", async () => {
    const { userId, sub } = await userOn("pro_monthly");
    const [old] = await grantsOf(userId);
    await move({
      from: sub,
      toPlan: plans.starter_monthly,
      status: "downgraded",
    });
    const converted = (await grantsOf(userId)).find((g) => g.id === old.id)!;
    expect(converted.kind).toBe("carryover");
    expect(converted.converted_at).toEqual(t);
  });
});
