import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/api/server.js";
import {
  getPlanByName,
  setPaddleIds,
} from "../../src/db/repositories/catalog.repo.js";
import { getActiveSubscription } from "../../src/db/repositories/subscriptions.repo.js";
import type { PlanWithCredits } from "../../src/db/rows.js";
import { T } from "../../src/db/tables.js";
import { addDays, addMinutes } from "../../src/lib/time.js";
import { makeDeps } from "../helpers/app.js";
import { authHeader } from "../helpers/auth.js";
import { seedTestCatalog } from "../helpers/catalog.js";
import { resetDb, testDb } from "../helpers/db.js";
import { createUserOnPlan } from "../helpers/factories.js";

const T0 = new Date("2026-03-10T12:00:00Z");

describe("billing subscription changes API", () => {
  let ctx: ReturnType<typeof makeDeps>;
  let app: ReturnType<typeof createApp>;
  let P: Record<string, PlanWithCredits>;

  beforeEach(async () => {
    await resetDb();
    ({ plans: P } = await seedTestCatalog(testDb));
    ctx = makeDeps();
    app = createApp(ctx.deps);
  });

  const priceOf = (name: string) => `pri_${name}`;

  async function register(name: string) {
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

  async function paidUser(
    planName: string,
    live: Partial<{
      priceId: string;
      status: string;
      periodEnd: Date;
      scheduledChange: { action: "cancel"; effectiveAt: Date } | null;
    }> = {},
    next?: string,
  ) {
    await register(planName);
    const periodEnd = addDays(T0, 20);
    const { userId, sub } = await createUserOnPlan(ctx.deps, {
      planName,
      periodStart: T0,
      periodEnd,
      paddleSubscriptionId: "sub_01",
    });
    ctx.paddle.subscriptions.set("sub_01", {
      id: "sub_01",
      status: "active",
      priceId: priceOf(planName),
      periodEnd,
      scheduledChange: null,
      ...live,
    });
    if (next) {
      await register(next);
      await testDb(T.subscriptions)
        .where({ id: sub.id })
        .update({ next_plan_id: P[next]!.id });
    }
    return { userId, sub };
  }

  async function withEmail(userId: string) {
    await testDb(T.profiles)
      .where({ id: userId })
      .update({ email: `${userId}@example.test` });
  }

  const post = async (userId: string, plan: string) =>
    request(app)
      .post("/v1/billing/subscription")
      .set(await authHeader(userId))
      .send({ plan });
  const active = async (userId: string) =>
    (await getActiveSubscription(testDb, userId))!;

  it.each([
    ["free", "starter_monthly", "new"],
    ["starter_monthly", "pro_monthly", "upgrade"],
    ["pro_yearly", "pro_monthly", "downgrade"],
  ])("%s → %s opens a checkout (%s)", async (from, to, changeType) => {
    const { userId, sub } =
      from === "free"
        ? await createUserOnPlan(ctx.deps, {
            planName: "free",
            periodStart: T0,
            periodEnd: addDays(T0, 30),
          })
        : await paidUser(from);
    await withEmail(userId);
    const res = await post(userId, to);
    expect(res.status).toBe(200);
    expect(res.body.action).toBe("checkout");
    const inv = await testDb(T.invoices).where({ user_id: userId }).first();
    expect(inv.change_type).toBe(changeType);
    expect(inv.from_subscription_id).toBe(sub.id);
    expect(inv.item_id).toBe(P[to]!.id);
  });

  it("pro_monthly → starter_monthly is scheduled with do_not_bill", async () => {
    const { userId } = await paidUser("pro_monthly");
    const res = await post(userId, "starter_monthly");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      action: "scheduled",
      effectiveAt: "2026-03-30T12:00:00.000Z",
    });
    const starterPrice = (await getPlanByName(testDb, "starter_monthly"))!
      .paddle_price_id;
    expect(starterPrice).toBeTruthy();
    expect(ctx.paddle.calls.at(-1)).toEqual({
      method: "updateSubscriptionPrice",
      args: ["sub_01", starterPrice],
    });
    expect((await active(userId)).next_plan_id).toBe(P.starter_monthly!.id);
  });

  it("pro_monthly → free schedules a cancel at period end", async () => {
    const { userId } = await paidUser("pro_monthly");
    const res = await post(userId, "free");
    expect(res.body.action).toBe("scheduled");
    expect(ctx.paddle.callsTo("cancelSubscription")[0]!.args).toEqual([
      "sub_01",
      "next_billing_period",
    ]);
    expect(ctx.paddle.callsTo("updateSubscriptionPrice")).toHaveLength(0);
    expect((await active(userId)).next_plan_id).toBe(P.free!.id);
  });

  it("same plan with nothing scheduled → 409 ALREADY_ON_PLAN", async () => {
    const { userId } = await paidUser("pro_monthly");
    const res = await post(userId, "pro_monthly");
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("ALREADY_ON_PLAN");
  });

  it("same plan with a scheduled downgrade reverts it", async () => {
    const { userId } = await paidUser(
      "pro_monthly",
      { priceId: priceOf("starter_monthly") },
      "starter_monthly",
    );
    const res = await post(userId, "pro_monthly");
    expect(res.body).toEqual({ action: "reverted" });
    expect(ctx.paddle.callsTo("updateSubscriptionPrice")[0]!.args).toEqual([
      "sub_01",
      priceOf("pro_monthly"),
    ]);
    expect((await active(userId)).next_plan_id).toBe(P.pro_monthly!.id);
  });

  it.each(["nope", "archived_plan", "custom_plan"])(
    "%s → 422 PLAN_NOT_AVAILABLE",
    async (name) => {
      const { userId } = await paidUser("pro_monthly");
      const res = await post(userId, name);
      expect(res.status).toBe(422);
      expect(res.body.code).toBe("PLAN_NOT_AVAILABLE");
    },
  );

  it("59 minutes before renewal → 409 RENEWAL_IN_PROGRESS; 61 minutes → allowed", async () => {
    const { userId } = await paidUser("pro_monthly", {
      periodEnd: addMinutes(T0, 59),
    });
    const blocked = await post(userId, "starter_monthly");
    expect(blocked.status).toBe(409);
    expect(blocked.body.code).toBe("RENEWAL_IN_PROGRESS");
    ctx.paddle.subscriptions.set("sub_01", {
      ...ctx.paddle.subscriptions.get("sub_01")!,
      periodEnd: addMinutes(T0, 61),
    });
    const ok = await post(userId, "starter_monthly");
    expect(ok.status).toBe(200);
  });

  it("past due: a scheduled downgrade → 409 PAYMENT_PAST_DUE", async () => {
    const { userId } = await paidUser("pro_monthly", { status: "past_due" });
    const res = await post(userId, "starter_monthly");
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("PAYMENT_PAST_DUE");
  });

  it("past due: an upgrade opens a checkout", async () => {
    const { userId } = await paidUser("starter_monthly", {
      status: "past_due",
    });
    await withEmail(userId);
    const res = await post(userId, "pro_monthly");
    expect(res.status).toBe(200);
    expect(res.body.action).toBe("checkout");
  });

  it("past due: cancel is immediate and moves to Free with nothing carried over", async () => {
    const { userId, sub } = await paidUser("pro_monthly", {
      status: "past_due",
    });
    const res = await post(userId, "free");
    expect(res.body).toEqual({ action: "canceled" });
    expect(ctx.paddle.callsTo("cancelSubscription")[0]!.args).toEqual([
      "sub_01",
      "immediately",
    ]);
    const now = await active(userId);
    expect(now.plan.name).toBe("free");
    expect(now.paddle_subscription_id).toBeNull();
    const old = await testDb(T.subscriptions).where({ id: sub.id }).first();
    expect(old.status).toBe("canceled");
    const grant = await testDb(T.creditGrants)
      .where({ subscription_id: sub.id })
      .first();
    expect(grant?.kind).not.toBe("carryover");
    expect(
      await testDb(T.creditGrants).where({
        kind: "carryover",
        user_id: userId,
      }),
    ).toHaveLength(0);
  });

  it("reads the live Paddle state: a cancel made in Paddle is cleared before a downgrade", async () => {
    const { userId } = await paidUser("pro_monthly", {
      scheduledChange: { action: "cancel", effectiveAt: addDays(T0, 20) },
    });
    const res = await post(userId, "starter_monthly");
    expect(res.body.action).toBe("scheduled");
    const methods = ctx.paddle.calls.map((c) => c.method);
    expect(methods.indexOf("removeScheduledChange")).toBeLessThan(
      methods.indexOf("updateSubscriptionPrice"),
    );
    expect((await active(userId)).next_plan_id).toBe(P.starter_monthly!.id);
  });

  it("undoes the first Paddle call when the second fails (downgrade)", async () => {
    const { userId } = await paidUser("pro_monthly", {
      scheduledChange: { action: "cancel", effectiveAt: addDays(T0, 20) },
    });
    ctx.paddle.failNext("updateSubscriptionPrice");
    const res = await post(userId, "starter_monthly");
    expect(res.status).toBe(502);
    expect(res.body.code).toBe("PAYMENT_PROVIDER_ERROR");
    expect(ctx.paddle.callsTo("cancelSubscription")[0]!.args).toEqual([
      "sub_01",
      "next_billing_period",
    ]);
    expect((await active(userId)).next_plan_id).toBe(P.pro_monthly!.id);
  });

  it("undoes the first Paddle call when the second fails (cancel)", async () => {
    const { userId } = await paidUser(
      "pro_monthly",
      { priceId: priceOf("starter_monthly") },
      "starter_monthly",
    );
    ctx.paddle.failNext("cancelSubscription");
    const res = await post(userId, "free");
    expect(res.status).toBe(502);
    const updates = ctx.paddle.callsTo("updateSubscriptionPrice");
    expect(updates.map((c) => c.args)).toEqual([
      ["sub_01", priceOf("pro_monthly")],
      ["sub_01", priceOf("starter_monthly")],
    ]);
    expect((await active(userId)).next_plan_id).toBe(P.starter_monthly!.id);
  });

  const del = async (userId: string) =>
    request(app)
      .delete("/v1/billing/subscription/scheduled-change")
      .set(await authHeader(userId));

  it("DELETE scheduled-change without one → 409 NO_SCHEDULED_CHANGE", async () => {
    const { userId } = await paidUser("pro_monthly");
    const res = await del(userId);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("NO_SCHEDULED_CHANGE");
  });

  it("DELETE scheduled-change undoes a scheduled cancel", async () => {
    const { userId } = await paidUser(
      "pro_monthly",
      { scheduledChange: { action: "cancel", effectiveAt: addDays(T0, 20) } },
      "free",
    );
    const res = await del(userId);
    expect(res.status).toBe(200);
    expect(res.body.subscription).toMatchObject({
      plan: "pro_monthly",
      nextPlan: null,
    });
    expect(ctx.paddle.callsTo("removeScheduledChange")[0]!.args).toEqual([
      "sub_01",
    ]);
    expect((await active(userId)).next_plan_id).toBe(P.pro_monthly!.id);
  });

  it("preview describes without calling Paddle mutations", async () => {
    const { userId } = await paidUser("pro_monthly");
    ctx.paddle.calls.length = 0;
    const res = await request(app)
      .get("/v1/billing/subscription/preview?plan=starter_monthly")
      .set(await authHeader(userId));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      changeType: "downgrade",
      action: "period_end",
      effectiveAt: "2026-03-30T12:00:00.000Z",
      description:
        "You'll be moved to the Starter plan at the end of your current billing cycle.",
    });
    expect(ctx.paddle.calls.map((c) => c.method)).toEqual(["getSubscription"]);
  });

  it("preview of a past-due cancel says it happens immediately", async () => {
    const { userId } = await paidUser("pro_monthly", { status: "past_due" });
    ctx.paddle.calls.length = 0;
    const res = await request(app)
      .get("/v1/billing/subscription/preview?plan=free")
      .set(await authHeader(userId));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      changeType: "cancel",
      action: "now",
      effectiveAt: T0.toISOString(),
      description: "You'll be moved to the Free plan immediately.",
    });
    expect(ctx.paddle.calls.map((c) => c.method)).toEqual(["getSubscription"]);
  });

  it("undoes the cleared cancel when the price revert fails (revert)", async () => {
    const { userId } = await paidUser(
      "pro_monthly",
      {
        priceId: priceOf("starter_monthly"),
        scheduledChange: { action: "cancel", effectiveAt: addDays(T0, 20) },
      },
      "starter_monthly",
    );
    ctx.paddle.failNext("updateSubscriptionPrice");
    const res = await del(userId);
    expect(res.status).toBe(502);
    expect(res.body.code).toBe("PAYMENT_PROVIDER_ERROR");
    expect(ctx.paddle.callsTo("cancelSubscription")[0]!.args).toEqual([
      "sub_01",
      "next_billing_period",
    ]);
    expect((await active(userId)).next_plan_id).toBe(P.starter_monthly!.id);
  });

  it("a paid row without a Paddle subscription id is a 500 and logged", async () => {
    await register("pro_monthly");
    const { userId, sub } = await createUserOnPlan(ctx.deps, {
      planName: "pro_monthly",
      periodStart: T0,
      periodEnd: addDays(T0, 20),
    });
    const calls: Array<() => Promise<request.Response>> = [
      () => post(userId, "starter_monthly"),
      () => del(userId),
    ];
    for (const call of calls) {
      ctx.logs.length = 0;
      const res = await call();
      expect(res.status).toBe(500);
      expect(res.body.code).toBe("INTERNAL");
      expect(
        ctx.logs.some(
          (l) =>
            l.severity === "ERROR" &&
            JSON.stringify(l).includes(userId) &&
            JSON.stringify(l).includes(sub.id),
        ),
      ).toBe(true);
    }
    const preview = await request(app)
      .get("/v1/billing/subscription/preview?plan=starter_monthly")
      .set(await authHeader(userId));
    expect(preview.status).toBe(500);
    expect((await active(userId)).next_plan_id).toBe(P.pro_monthly!.id);
    expect(ctx.paddle.calls).toHaveLength(0);
  });

  it("an upgrade with no email is a 422 before any Paddle registration", async () => {
    const { userId } = await paidUser("starter_monthly");
    const res = await post(userId, "pro_monthly");
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("VALIDATION_FAILED");
    const methods = ctx.paddle.calls.map((c) => c.method);
    expect(methods).not.toContain("createProduct");
    expect(methods).not.toContain("createPrice");
    expect(methods).not.toContain("createTransaction");
  });
});
