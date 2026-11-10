import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/api/server.js";
import { setPaddleIds } from "../../src/db/repositories/catalog.repo.js";
import type { PlanWithCredits } from "../../src/db/rows.js";
import { T } from "../../src/db/tables.js";
import { addDays, addMinutes } from "../../src/lib/time.js";
import { makeDeps } from "../helpers/app.js";
import { seedTestCatalog } from "../helpers/catalog.js";
import { resetDb, testDb } from "../helpers/db.js";
import { createUserOnPlan } from "../helpers/factories.js";
import {
  postPaddle,
  subscriptionCanceled,
  subscriptionPaused,
  subscriptionPastDue,
  subscriptionUpdated,
  txnCompleted,
} from "../helpers/paddleEvents.js";

const T0 = new Date("2026-03-10T12:00:00Z");
const T1 = addDays(T0, 30);
const iso = (d: Date) => d.toISOString();
const priceOf = (name: string) => `pri_${name}`;

describe("Paddle webhook: renewals, cancellations, Paddle-side changes", () => {
  let ctx: ReturnType<typeof makeDeps>;
  let app: ReturnType<typeof createApp>;
  let P: Record<string, PlanWithCredits>;

  beforeEach(async () => {
    await resetDb();
    ({ plans: P } = await seedTestCatalog(testDb));
    ctx = makeDeps();
    app = createApp(ctx.deps);
    for (const name of ["starter_monthly", "pro_monthly", "pro_yearly"]) {
      await testDb.transaction((trx) =>
        setPaddleIds(
          trx,
          "plan",
          P[name]!.id,
          { productId: `pro_${name}`, priceId: priceOf(name) },
          T0,
        ),
      );
    }
  });

  async function userOn(plan: string, paddleSub = "sub_01") {
    return createUserOnPlan(ctx.deps, {
      planName: plan,
      periodStart: T0,
      periodEnd: T1,
      paddleSubscriptionId: paddleSub,
    });
  }
  const rows = (userId: string) =>
    testDb(T.subscriptions).where({ user_id: userId }).orderBy("created_at");
  const grantsOf = (subId: string) =>
    testDb(T.creditGrants).where({ subscription_id: subId });
  const errors = () => ctx.logs.filter((l) => l.severity === "ERROR");

  function renewal(
    priceName: string,
    p: { txnId?: string; starts?: Date; sub?: string } = {},
  ) {
    const starts = p.starts ?? T1;
    return postPaddle(
      app,
      txnCompleted({
        txnId: p.txnId,
        origin: "subscription_recurring",
        subscriptionId: p.sub ?? "sub_01",
        priceId: priceOf(priceName),
        totalCents: "2000",
        billingPeriod: {
          startsAt: iso(starts),
          endsAt: iso(addDays(starts, 30)),
        },
      }),
    );
  }

  it("a normal renewal opens a new period with fresh credits and leaves the old grant to expire", async () => {
    const { userId, sub } = await userOn("pro_monthly");
    const oldGrant = (await grantsOf(sub.id))[0];
    ctx.clock.set(addMinutes(T1, 5));
    expect((await renewal("pro_monthly")).status).toBe(200);
    const [old, fresh] = await rows(userId);
    expect(old).toMatchObject({ status: "renewed", active: false });
    expect(fresh).toMatchObject({
      plan_id: P.pro_monthly!.id,
      active: true,
      current_period_start: T1,
      current_period_end: addDays(T1, 30),
    });
    const g = await grantsOf(fresh.id);
    expect(g).toHaveLength(1);
    expect(g[0]).toMatchObject({ kind: "plan", total: P.pro_monthly!.credits });
    const og = (await grantsOf(sub.id))[0];
    expect(og.kind).toBe("plan");
    expect(og.expires_at).toEqual(oldGrant.expires_at);
    const inv = await testDb(T.invoices).where({ user_id: userId }).first();
    expect(inv).toMatchObject({ status: "paid", item_id: P.pro_monthly!.id });
  });

  async function downgradeSetup() {
    const u = await userOn("pro_monthly");
    await testDb(T.subscriptions)
      .where({ id: u.sub.id })
      .update({ next_plan_id: P.starter_monthly!.id });
    return u;
  }

  it("a scheduled downgrade happens at renewal and carries leftovers over", async () => {
    const { userId, sub } = await downgradeSetup();
    ctx.clock.set(addMinutes(T1, 5));
    await renewal("starter_monthly");
    const [old, fresh] = await rows(userId);
    expect(old.status).toBe("downgraded");
    expect(fresh.plan_id).toBe(P.starter_monthly!.id);
    const og = (await grantsOf(sub.id))[0];
    expect(og.kind).toBe("carryover");
    expect(og.expires_at).toEqual(addDays(T1, 30));
    expect((await grantsOf(fresh.id))[0]).toMatchObject({
      kind: "plan",
      total: 500,
    });
  });

  it("carries over even when the webhook arrives after the old grant and its grace expired", async () => {
    const { sub } = await downgradeSetup();
    ctx.clock.set(addMinutes(T1, 120));
    await renewal("starter_monthly");
    expect((await grantsOf(sub.id))[0].expires_at).toEqual(addDays(T1, 30));
  });

  it("measures a late recovery's carryover from the billed period's start", async () => {
    const { sub } = await downgradeSetup();
    ctx.clock.set(addDays(T1, 5));
    await renewal("starter_monthly");
    expect((await grantsOf(sub.id))[0].expires_at).toEqual(addDays(T1, 30));
  });

  it("ignores a replayed or out-of-order renewal", async () => {
    const { userId } = await userOn("pro_monthly");
    ctx.clock.set(addMinutes(T1, 5));
    await renewal("pro_monthly", { txnId: "txn_r1" });
    await renewal("pro_monthly", { txnId: "txn_r1" });
    expect(await rows(userId)).toHaveLength(2);
    await renewal("pro_monthly", { txnId: "txn_r0", starts: T1 });
    expect(await rows(userId)).toHaveLength(2);
    expect(await testDb(T.invoices).where({ user_id: userId })).toHaveLength(2);
  });

  it("logs and stops on an unknown price", async () => {
    const { userId } = await userOn("pro_monthly");
    await postPaddle(
      app,
      txnCompleted({
        origin: "subscription_recurring",
        subscriptionId: "sub_01",
        priceId: "pri_unknown",
        billingPeriod: { startsAt: iso(T1), endsAt: iso(addDays(T1, 30)) },
      }),
    );
    expect(await rows(userId)).toHaveLength(1);
    const inv = await testDb(T.invoices).where({ user_id: userId });
    expect(inv).toHaveLength(1);
    expect(inv[0].item_id).toBeNull();
    expect(errors().length).toBeGreaterThan(0);
  });

  it("logs a renewal on a subscription that is no longer active", async () => {
    const { userId } = await userOn("starter_monthly", "sub_old");
    await testDb(T.subscriptions)
      .where({ user_id: userId })
      .update({ active: false, status: "upgraded" });
    const res = await renewal("starter_monthly", { sub: "sub_old" });
    expect(res.status).toBe(200);
    expect(await testDb(T.invoices).where({ user_id: userId })).toHaveLength(1);
    expect(await rows(userId)).toHaveLength(1);
    expect(errors().some((l) => l.paddleSubscriptionId === "sub_old")).toBe(
      true,
    );
  });

  it("subscription.canceled moves the user to Free with nothing carried over", async () => {
    const { userId, sub } = await userOn("pro_monthly");
    const at = addDays(T0, 10);
    await postPaddle(
      app,
      subscriptionCanceled({ occurredAt: iso(at), canceledAt: iso(at) }),
    );
    const [old, free] = await rows(userId);
    expect(old.status).toBe("canceled");
    expect(free).toMatchObject({
      plan_id: P.free!.id,
      active: true,
      paddle_subscription_id: null,
    });
    expect(await grantsOf(free.id)).toHaveLength(1);
    expect((await grantsOf(sub.id))[0].kind).toBe("plan");
  });

  it("subscription.canceled for an inactive row is ignored", async () => {
    const { userId } = await userOn("pro_monthly");
    await testDb(T.subscriptions)
      .where({ user_id: userId })
      .update({ active: false, status: "upgraded" });
    expect((await postPaddle(app, subscriptionCanceled())).status).toBe(200);
    expect(await rows(userId)).toHaveLength(1);
  });

  const current = async (userId: string) =>
    testDb(T.subscriptions).where({ user_id: userId, active: true }).first();

  it("subscription.updated mirrors a cancel scheduled in Paddle", async () => {
    const { userId } = await userOn("pro_monthly");
    await postPaddle(
      app,
      subscriptionUpdated({
        priceId: priceOf("pro_monthly"),
        scheduledChange: { action: "cancel", effectiveAt: iso(T1) },
      }),
    );
    expect((await current(userId)).next_plan_id).toBe(P.free!.id);
  });

  it("subscription.updated mirrors a removed scheduled change", async () => {
    const { userId, sub } = await userOn("pro_monthly");
    await testDb(T.subscriptions)
      .where({ id: sub.id })
      .update({ next_plan_id: P.free!.id });
    await postPaddle(
      app,
      subscriptionUpdated({ priceId: priceOf("pro_monthly") }),
    );
    expect((await current(userId)).next_plan_id).toBe(P.pro_monthly!.id);
  });

  it("subscription.updated mirrors a price changed in Paddle", async () => {
    const { userId } = await userOn("pro_monthly");
    await postPaddle(
      app,
      subscriptionUpdated({ priceId: priceOf("starter_monthly") }),
    );
    expect((await current(userId)).next_plan_id).toBe(P.starter_monthly!.id);
  });

  it("ignores an older subscription.updated that arrives late", async () => {
    const { userId } = await userOn("pro_monthly");
    await postPaddle(
      app,
      subscriptionUpdated({
        priceId: priceOf("starter_monthly"),
        occurredAt: "2026-03-15T09:00:00Z",
      }),
    );
    await postPaddle(
      app,
      subscriptionUpdated({
        priceId: priceOf("pro_monthly"),
        occurredAt: "2026-03-14T09:00:00Z",
      }),
    );
    expect((await current(userId)).next_plan_id).toBe(P.starter_monthly!.id);
  });

  it("an older event is still ignored after a renewal on the same Paddle subscription", async () => {
    const { userId } = await userOn("pro_monthly");
    await postPaddle(
      app,
      subscriptionUpdated({
        priceId: priceOf("pro_monthly"),
        occurredAt: "2026-03-20T09:00:00Z",
      }),
    );
    ctx.clock.set(addMinutes(T1, 5));
    await renewal("pro_monthly");
    await postPaddle(
      app,
      subscriptionUpdated({
        priceId: priceOf("starter_monthly"),
        occurredAt: "2026-03-18T09:00:00Z",
      }),
    );
    const row = await current(userId);
    expect(row.next_plan_id).toBe(P.pro_monthly!.id);
    expect(row.last_event_occurred_at).toEqual(
      new Date("2026-03-20T09:00:00Z"),
    );
  });

  it("subscription.past_due sets paddle_status past_due", async () => {
    const { userId } = await userOn("pro_monthly");
    await postPaddle(
      app,
      subscriptionPastDue({ priceId: priceOf("pro_monthly") }),
    );
    expect((await current(userId)).paddle_status).toBe("past_due");
  });

  it("subscription.paused records the status and logs an ERROR", async () => {
    const { userId } = await userOn("pro_monthly");
    await postPaddle(
      app,
      subscriptionPaused({ priceId: priceOf("pro_monthly") }),
    );
    const row = await current(userId);
    expect(row.paddle_status).toBe("paused");
    expect(row.next_plan_id).toBe(P.pro_monthly!.id);
    expect(
      errors().some((l) =>
        String(l.message).includes("paused subscriptions are not supported"),
      ),
    ).toBe(true);
  });
});
