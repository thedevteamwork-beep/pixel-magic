import { randomUUID } from "node:crypto";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/api/server.js";
import { T } from "../../src/db/tables.js";
import { makeDeps } from "../helpers/app.js";
import { authHeader } from "../helpers/auth.js";
import { seedTestCatalog } from "../helpers/catalog.js";
import { resetDb, testDb } from "../helpers/db.js";

describe("billing add-ons and invoices API", () => {
  let userId: string;
  let ctx: ReturnType<typeof makeDeps>;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    await resetDb();
    await seedTestCatalog(testDb);
    userId = randomUUID();
    ctx = makeDeps();
    app = createApp(ctx.deps);
  });

  async function post(path: string, body: unknown) {
    return request(app)
      .post(path)
      .set(await authHeader(userId))
      .send(body as object);
  }

  it("opens a Paddle checkout for an add-on", async () => {
    const res = await post("/v1/billing/addons", { addon: "credits_1000" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      action: "checkout",
      transactionId: "txn_1",
      checkoutUrl: "https://checkout.test/txn_1",
    });
    const inv = await testDb(T.invoices).first();
    expect(inv).toMatchObject({
      item_type: "addon",
      status: "draft",
      paddle_transaction_id: "txn_1",
      amount: "20.00",
    });
    expect(inv.created_at).toEqual(ctx.clock.now());
    expect(
      ctx.paddle.calls.find((c) => c.method === "createTransaction")!.args[0],
    ).toMatchObject({
      customerId: "ctm_1",
      priceId: "pri_1",
      customData: { userId, invoiceId: inv.id, checkout: "true" },
    });
  });

  it("registers the customer and the one-time price once", async () => {
    await post("/v1/billing/addons", { addon: "credits_1000" });
    ctx.clock.advance(31 * 60_000);
    await post("/v1/billing/addons", { addon: "credits_1000" });
    expect(ctx.paddle.callsTo("createCustomer")).toHaveLength(1);
    expect(ctx.paddle.callsTo("createProduct")).toHaveLength(1);
    expect(ctx.paddle.callsTo("createPrice")).toHaveLength(1);
    expect(ctx.paddle.callsTo("createPrice")[0]!.args[0]).toMatchObject({
      interval: null,
      amountCents: "2000",
    });
  });

  it("prices 9.99 as 999 cents", async () => {
    await post("/v1/billing/addons", { addon: "credits_999c" });
    expect(ctx.paddle.callsTo("createPrice")[0]!.args[0]).toMatchObject({
      amountCents: "999",
    });
  });

  it("reuses an unpaid checkout within 30 minutes, not after", async () => {
    await post("/v1/billing/addons", { addon: "credits_1000" });
    ctx.clock.advance(29 * 60_000);
    const again = await post("/v1/billing/addons", { addon: "credits_1000" });
    expect(again.body.transactionId).toBe("txn_1");
    expect(ctx.paddle.callsTo("createTransaction")).toHaveLength(1);
    ctx.clock.advance(2 * 60_000);
    const later = await post("/v1/billing/addons", { addon: "credits_1000" });
    expect(later.body.transactionId).toBe("txn_2");
  });

  it("returns 502 PAYMENT_PROVIDER_ERROR and cancels the draft when Paddle fails", async () => {
    ctx.paddle.failNext("createTransaction");
    const res = await post("/v1/billing/addons", { addon: "credits_1000" });
    expect(res.status).toBe(502);
    expect(res.body.code).toBe("PAYMENT_PROVIDER_ERROR");
    const inv = await testDb(T.invoices).first();
    expect(inv.status).toBe("canceled");
  });

  it.each(["createCustomer", "createProduct", "createPrice"] as const)(
    "returns 502 when Paddle %s fails and leaves no draft",
    async (method) => {
      ctx.paddle.failNext(method);
      const res = await post("/v1/billing/addons", { addon: "credits_1000" });
      expect(res.status).toBe(502);
      expect(res.body.code).toBe("PAYMENT_PROVIDER_ERROR");
      expect(await testDb(T.invoices).where("status", "draft")).toHaveLength(0);
    },
  );

  it("returns 422 when the profile has no email, before any Paddle call", async () => {
    const res = await request(app)
      .post("/v1/billing/addons")
      .set(await authHeader(userId, { email: null }))
      .send({ addon: "credits_1000" });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("VALIDATION_FAILED");
    expect(res.body.message).toBe("An email address is required to buy");
    expect(ctx.paddle.calls).toHaveLength(0);
  });

  it("stores the token's email on a profile created without one, then buys", async () => {
    const me = await request(app)
      .get("/v1/me")
      .set(await authHeader(userId, { email: null }));
    expect(me.status).toBe(200);
    const before = await testDb(T.profiles).where({ id: userId }).first();
    expect(before.email).toBeNull();

    const res = await request(app)
      .post("/v1/billing/addons")
      .set(await authHeader(userId, { email: "later@test.dev" }))
      .send({ addon: "credits_1000" });
    expect(res.status).toBe(200);
    expect(ctx.paddle.callsTo("createCustomer")[0]!.args).toEqual([
      "later@test.dev",
    ]);
    const after = await testDb(T.profiles).where({ id: userId }).first();
    expect(after.email).toBe("later@test.dev");
  });

  it.each(["nope", "archived_addon"])(
    "rejects %s with 422 ADDON_NOT_AVAILABLE",
    async (addon) => {
      const res = await post("/v1/billing/addons", { addon });
      expect(res.status).toBe(422);
      expect(res.body.code).toBe("ADDON_NOT_AVAILABLE");
    },
  );

  it("rejects a missing addon name with 422 VALIDATION_FAILED", async () => {
    const res = await post("/v1/billing/addons", {});
    expect(res.status).toBe(422);
  });

  it("lists only paid invoices, newest first", async () => {
    await post("/v1/billing/addons", { addon: "credits_1000" });
    const addon = await testDb(T.addons).where("name", "credits_1000").first();
    const plan = await testDb(T.plans).where("name", "pro_monthly").first();
    await testDb(T.invoices).insert([
      {
        user_id: userId,
        item_type: "addon",
        item_id: addon.id,
        status: "paid",
        amount: "20.00",
        paid_at: new Date("2026-03-01T00:00:00Z"),
      },
      {
        user_id: userId,
        item_type: "plan",
        item_id: plan.id,
        status: "paid",
        amount: "30.00",
        paid_at: new Date("2026-03-05T00:00:00Z"),
      },
    ]);
    const res = await request(app)
      .get("/v1/billing/invoices")
      .set(await authHeader(userId));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        id: expect.any(String),
        itemType: "plan",
        item: "pro_monthly",
        amount: "30.00",
        currency: "USD",
        status: "paid",
        paidAt: "2026-03-05T00:00:00.000Z",
        transactionId: null,
      },
      {
        id: expect.any(String),
        itemType: "addon",
        item: "credits_1000",
        amount: "20.00",
        currency: "USD",
        status: "paid",
        paidAt: "2026-03-01T00:00:00.000Z",
        transactionId: null,
      },
    ]);
  });

  it("lists paid invoices with their Paddle transaction id", async () => {
    await post("/v1/billing/addons", { addon: "credits_1000" });
    const addon = await testDb(T.addons).where("name", "credits_1000").first();
    await testDb(T.invoices).insert({
      user_id: userId,
      item_type: "addon",
      item_id: addon.id,
      status: "paid",
      amount: "20.00",
      paid_at: new Date("2026-03-01T00:00:00Z"),
      paddle_transaction_id: "txn_paid_1",
    });
    const res = await request(app)
      .get("/v1/billing/invoices")
      .set(await authHeader(userId));
    expect(res.status).toBe(200);
    expect(res.body[0]).toMatchObject({
      transactionId: "txn_paid_1",
      status: "paid",
    });
  });
});
