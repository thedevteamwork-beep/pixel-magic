import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/api/server.js";
import type { PlanWithCredits } from "../../src/db/rows.js";
import { T } from "../../src/db/tables.js";
import { addDays, addMinutes } from "../../src/lib/time.js";
import { makeDeps } from "../helpers/app.js";
import { authHeader } from "../helpers/auth.js";
import { seedTestCatalog } from "../helpers/catalog.js";
import { resetDb, testDb } from "../helpers/db.js";
import { createUserOnPlan } from "../helpers/factories.js";
import { postPaddle, txnCompleted } from "../helpers/paddleEvents.js";

const T0 = new Date("2026-03-10T12:00:00Z");
const BP = {
  startsAt: "2026-03-10T12:00:00Z",
  endsAt: "2026-04-10T12:00:00Z",
};

describe("Paddle webhook: checkout completion", () => {
  let ctx: ReturnType<typeof makeDeps>;
  let app: ReturnType<typeof createApp>;
  let P: Record<string, PlanWithCredits>;

  beforeEach(async () => {
    await resetDb();
    ({ plans: P } = await seedTestCatalog(testDb));
    ctx = makeDeps();
    app = createApp(ctx.deps);
  });

  async function userOn(plan: string, paddleSub?: string, days = 30) {
    const { userId, sub } = await createUserOnPlan(ctx.deps, {
      planName: plan,
      periodStart: T0,
      periodEnd: addDays(T0, days),
      paddleSubscriptionId: paddleSub,
    });
    await testDb(T.profiles)
      .where({ id: userId })
      .update({ email: `${userId}@example.test` });
    if (paddleSub) {
      ctx.paddle.subscriptions.set(paddleSub, {
        id: paddleSub,
        status: "active",
        priceId: null,
        periodEnd: addDays(T0, days),
        scheduledChange: null,
      });
    }
    return { userId, sub };
  }

  async function open(userId: string, path: string, body: object) {
    const res = await request(app)
      .post(path)
      .set(await authHeader(userId))
      .send(body);
    expect(res.status).toBe(200);
    return res.body.transactionId as string;
  }
  const openPlan = (u: string, plan: string) =>
    open(u, "/v1/billing/subscription", { plan });

  async function invoiceOf(txnId: string) {
    return testDb(T.invoices).where({ paddle_transaction_id: txnId }).first();
  }

  async function complete(
    userId: string,
    txnId: string,
    p: {
      subscriptionId?: string | null;
      eventId?: string;
      origin?: string;
    } = {},
  ) {
    const inv = await invoiceOf(txnId);
    return postPaddle(
      app,
      txnCompleted({
        eventId: p.eventId,
        txnId,
        origin: p.origin,
        subscriptionId: p.subscriptionId,
        customData: { userId, invoiceId: inv.id, checkout: "true" },
        billingPeriod: BP,
        totalCents: "2000",
      }),
    );
  }

  const rows = (userId: string) =>
    testDb(T.subscriptions).where({ user_id: userId }).orderBy("created_at");
  const grantFor = (subId: string) =>
    testDb(T.creditGrants).where({ subscription_id: subId }).first();

  it("rejects a bad signature with 401 and records nothing", async () => {
    const res = await postPaddle(app, txnCompleted({}), {
      signature: "ts=1;h1=bad",
    });
    expect(res.status).toBe(401);
    expect(await testDb(T.paymentEvents)).toHaveLength(0);
  });

  it("processes a duplicate event id once", async () => {
    const { userId } = await userOn("free");
    const txn = await openPlan(userId, "starter_monthly");
    const a = await complete(userId, txn, { eventId: "evt_dup" });
    const b = await complete(userId, txn, { eventId: "evt_dup" });
    expect([a.status, b.status]).toEqual([200, 200]);
    expect(await testDb(T.paymentEvents)).toHaveLength(1);
    expect(
      await testDb(T.creditGrants).where({
        user_id: userId,
        kind: "plan",
        total: 500,
      }),
    ).toHaveLength(1);
  });

  it("Free → Starter: closes Free, ends its grant, opens Starter with a fresh grant", async () => {
    const { userId, sub } = await userOn("free");
    const txn = await openPlan(userId, "starter_monthly");
    expect((await complete(userId, txn)).status).toBe(200);
    const [freeRow, newRow] = await rows(userId);
    expect(freeRow).toMatchObject({ status: "upgraded", active: false });
    expect(freeRow.current_period_end).toEqual(T0);
    expect((await grantFor(sub.id)).expires_at).toEqual(T0);
    expect(newRow).toMatchObject({
      plan_id: P.starter_monthly!.id,
      active: true,
      paddle_subscription_id: "sub_01",
      current_period_start: new Date(BP.startsAt),
      current_period_end: new Date(BP.endsAt),
    });
    expect(await grantFor(newRow.id)).toMatchObject({
      kind: "plan",
      total: 500,
      expires_at: addMinutes(new Date(BP.endsAt), 60),
    });
    expect((await invoiceOf(txn)).status).toBe("paid");
  });

  it("Starter → Pro carries leftovers over and cancels the old Paddle subscription", async () => {
    const { userId, sub } = await userOn("starter_monthly", "sub_old");
    const oldGrant = await grantFor(sub.id);
    const txn = await openPlan(userId, "pro_monthly");
    expect(
      (await complete(userId, txn, { subscriptionId: "sub_new" })).status,
    ).toBe(200);
    const old = await testDb(T.subscriptions).where({ id: sub.id }).first();
    expect(old).toMatchObject({
      status: "upgraded",
      active: false,
      paddle_cancel_pending: false,
    });
    const g = await grantFor(sub.id);
    expect(g.kind).toBe("carryover");
    const floor = addDays(T0, 30);
    expect(g.expires_at).toEqual(
      oldGrant.expires_at > floor ? oldGrant.expires_at : floor,
    );
    expect(ctx.paddle.callsTo("cancelSubscription")[0]!.args).toEqual([
      "sub_old",
      "immediately",
    ]);
  });

  it("pro_yearly → pro_monthly keeps the longer yearly expiry on the carryover", async () => {
    const { userId, sub } = await userOn("pro_yearly", "sub_old", 300);
    const before = await grantFor(sub.id);
    await testDb(T.creditGrants)
      .where({ id: before.id })
      .update({ expires_at: addDays(T0, 300) });
    const txn = await openPlan(userId, "pro_monthly");
    await complete(userId, txn, { subscriptionId: "sub_new" });
    const old = await testDb(T.subscriptions).where({ id: sub.id }).first();
    expect(old.status).toBe("downgraded");
    const g = await grantFor(sub.id);
    expect(g.kind).toBe("carryover");
    expect(g.expires_at).toEqual(addDays(T0, 300));
  });

  it("a replayed completion with a new event id grants once", async () => {
    const { userId } = await userOn("free");
    const txn = await openPlan(userId, "starter_monthly");
    await complete(userId, txn);
    const r = await complete(userId, txn);
    expect(r.status).toBe(200);
    expect(await testDb(T.paymentEvents)).toHaveLength(2);
    expect(
      await testDb(T.creditGrants).where({
        user_id: userId,
        kind: "plan",
        total: 500,
      }),
    ).toHaveLength(1);
    expect(await rows(userId)).toHaveLength(2);
  });

  it("two paid checkouts leave one active row and flag both old subscriptions", async () => {
    const { userId } = await userOn("starter_monthly", "sub_A");
    ctx.paddle.subscriptions.set("sub_B", {
      id: "sub_B",
      status: "active",
      priceId: null,
      periodEnd: addDays(T0, 30),
      scheduledChange: null,
    });
    ctx.paddle.subscriptions.set("sub_C", {
      id: "sub_C",
      status: "active",
      priceId: null,
      periodEnd: addDays(T0, 30),
      scheduledChange: null,
    });
    const t1 = await openPlan(userId, "pro_monthly");
    const t2 = await openPlan(userId, "pro_yearly");
    await complete(userId, t1, { subscriptionId: "sub_B" });
    await complete(userId, t2, { subscriptionId: "sub_C" });
    const active = await testDb(T.subscriptions).where({
      user_id: userId,
      active: true,
    });
    expect(active).toHaveLength(1);
    expect(active[0].plan_id).toBe(P.pro_yearly!.id);
    const cancelled = ctx.paddle
      .callsTo("cancelSubscription")
      .map((c) => c.args[0]);
    expect(cancelled.sort()).toEqual(["sub_A", "sub_B"]);
  });

  it("completes an add-on purchase with its own expiry", async () => {
    const { userId } = await userOn("free");
    const txn = await open(userId, "/v1/billing/addons", {
      addon: "credits_1000",
    });
    await complete(userId, txn, { subscriptionId: null });
    const ca = await testDb(T.customerAddons)
      .where({ user_id: userId })
      .first();
    expect(ca.bought_at).toEqual(T0);
    expect(ca.expires_at).toEqual(addDays(T0, 30));
    const g = await testDb(T.creditGrants)
      .where({ customer_addon_id: ca.id })
      .first();
    expect(g).toMatchObject({ kind: "addon", total: 1000 });
    expect(g.expires_at).toEqual(ca.expires_at);
    await complete(userId, txn, { subscriptionId: null });
    expect(await testDb(T.creditGrants).where({ kind: "addon" })).toHaveLength(
      1,
    );
    expect(await testDb(T.customerAddons)).toHaveLength(1);
  });

  it("honours a checkout paid after the sweep canceled its draft", async () => {
    const { userId } = await userOn("free");
    const txn = await openPlan(userId, "starter_monthly");
    await testDb(T.invoices)
      .where({ paddle_transaction_id: txn })
      .update({ status: "canceled" });
    await complete(userId, txn);
    expect((await invoiceOf(txn)).status).toBe("paid");
    expect(
      await testDb(T.creditGrants).where({
        user_id: userId,
        kind: "plan",
        total: 500,
      }),
    ).toHaveLength(1);
  });

  it.each([
    {},
    { invoiceId: "00000000-0000-4000-8000-000000000000", userId: "x" },
    { invoiceId: "inv_123", userId: "x" },
  ])(
    "records and ignores an api transaction we didn't create (%j)",
    async (customData) => {
      const { userId } = await userOn("free");
      const res = await postPaddle(app, txnCompleted({ customData }));
      expect(res.status).toBe(200);
      expect(await testDb(T.paymentEvents)).toHaveLength(1);
      expect(
        await testDb(T.creditGrants).where({ user_id: userId, kind: "plan" }),
      ).toHaveLength(1);
      expect(ctx.logs.some((l) => l.severity === "ERROR")).toBe(true);
    },
  );

  it("records a payment-method-change transaction and grants nothing", async () => {
    const { userId } = await userOn("starter_monthly", "sub_old");
    const before = await testDb(T.creditGrants).count();
    const res = await postPaddle(
      app,
      txnCompleted({
        origin: "subscription_payment_method_change",
        subscriptionId: "sub_old",
      }),
    );
    expect(res.status).toBe(200);
    expect(await testDb(T.paymentEvents)).toHaveLength(1);
    expect(await testDb(T.invoices).where({ user_id: userId })).toHaveLength(0);
    expect(await testDb(T.creditGrants).count()).toEqual(before);
  });

  it("returns 200 within 3 s when the post-commit cancel hangs, and keeps the flag", async () => {
    const { userId, sub } = await userOn("starter_monthly", "sub_old");
    const txn = await openPlan(userId, "pro_monthly");
    ctx.paddle.hangNext("cancelSubscription", 10_000);
    const t = Date.now();
    const res = await complete(userId, txn, { subscriptionId: "sub_new" });
    expect(res.status).toBe(200);
    expect(Date.now() - t).toBeLessThan(3500);
    expect(
      (await testDb(T.subscriptions).where({ id: sub.id }).first())
        .paddle_cancel_pending,
    ).toBe(true);
  }, 15_000);

  it("keeps the flag when the post-commit cancel throws", async () => {
    const { userId, sub } = await userOn("starter_monthly", "sub_old");
    const txn = await openPlan(userId, "pro_monthly");
    ctx.paddle.failNext("cancelSubscription");
    const res = await complete(userId, txn, { subscriptionId: "sub_new" });
    expect(res.status).toBe(200);
    expect(
      (await testDb(T.subscriptions).where({ id: sub.id }).first())
        .paddle_cancel_pending,
    ).toBe(true);
  });

  it("records a signed event whose data fails parsing, once, and logs ERROR", async () => {
    const { userId } = await userOn("free");
    const bad = txnCompleted({ eventId: "evt_bad", txnId: "txn_bad" }) as {
      data: Record<string, unknown>;
    };
    delete bad.data.details;
    const a = await postPaddle(app, bad);
    const b = await postPaddle(app, bad);
    expect([a.status, b.status]).toEqual([200, 200]);
    const evs = await testDb(T.paymentEvents);
    expect(evs).toHaveLength(1);
    expect(evs[0]).toMatchObject({
      paddle_event_id: "evt_bad",
      processed_at: null,
    });
    expect(
      ctx.logs.some(
        (l) => l.severity === "ERROR" && JSON.stringify(l).includes("evt_bad"),
      ),
    ).toBe(true);
    expect(
      await testDb(T.creditGrants).where({ user_id: userId, kind: "plan" }),
    ).toHaveLength(1);
  });

  it("rolls back and returns non-2xx when processing throws, then grants once on a valid retry", async () => {
    const { userId } = await userOn("free");
    const txn = await openPlan(userId, "starter_monthly");
    const inv = await invoiceOf(txn);
    const mk = (subscriptionId: string | null) =>
      txnCompleted({
        eventId: "evt_retry",
        txnId: txn,
        subscriptionId,
        customData: { userId, invoiceId: inv.id, checkout: "true" },
        billingPeriod: BP,
      });
    const first = await postPaddle(app, mk(null));
    expect(first.status).toBeGreaterThanOrEqual(500);
    expect(await testDb(T.paymentEvents)).toHaveLength(0);
    expect((await invoiceOf(txn)).status).toBe("draft");
    const second = await postPaddle(app, mk("sub_01"));
    expect(second.status).toBe(200);
    expect(
      await testDb(T.creditGrants).where({
        user_id: userId,
        kind: "plan",
        total: 500,
      }),
    ).toHaveLength(1);
    expect(await testDb(T.paymentEvents)).toHaveLength(1);
  });
});
