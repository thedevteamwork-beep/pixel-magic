import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { lockCatalogRow } from "../../src/db/repositories/catalog.repo.js";
import { T } from "../../src/db/tables.js";
import { resetDb, testDb } from "../helpers/db.js";

const now = new Date("2026-11-01T00:00:00Z");
const later = new Date("2026-12-01T00:00:00Z");

beforeEach(resetDb);
afterAll(() => testDb.destroy());

async function profile(): Promise<string> {
  const id = randomUUID();
  await testDb(T.profiles).insert({ id });
  return id;
}

async function plan(): Promise<string> {
  const [row] = await testDb(T.plans)
    .insert({
      name: `p_${randomUUID()}`,
      display: "P",
      priority: 1,
      interval: "monthly",
      amount: "10.00",
    })
    .returning("id");
  return row.id;
}

async function subscription(
  userId: string,
  planId: string,
  active: boolean,
): Promise<string> {
  const [row] = await testDb(T.subscriptions)
    .insert({
      user_id: userId,
      plan_id: planId,
      next_plan_id: planId,
      status: active ? "active" : "renewed",
      active,
      current_period_start: now,
      current_period_end: later,
    })
    .returning("id");
  return row.id;
}

function grant(userId: string, over: Record<string, unknown>) {
  return testDb(T.creditGrants).insert({
    user_id: userId,
    kind: "plan",
    total: 10,
    starts_at: now,
    expires_at: later,
    ...over,
  });
}

describe("constraints", () => {
  it("allows only one active subscription per user", async () => {
    const u = await profile();
    const p = await plan();
    await subscription(u, p, true);
    await expect(subscription(u, p, true)).rejects.toMatchObject({
      code: "23505",
    });
    await expect(subscription(u, p, false)).resolves.toBeTypeOf("string");
  });

  it("rejects a grant whose used + reserved exceeds total", async () => {
    const u = await profile();
    await expect(
      grant(u, { total: 10, used: 6, reserved: 5 }),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      grant(u, { total: 10, used: 5, reserved: 5 }),
    ).resolves.toBeDefined();
  });

  it("rejects a second allocation for the same job and grant", async () => {
    const u = await profile();
    const [g] = await grant(u, {}).returning("id");
    const [job] = await testDb(T.jobs)
      .insert({
        user_id: u,
        model_key: "m",
        input: {},
        credit_cost: 1,
        status: "queued",
        idempotency_key: "k",
        request_hash: "h",
      })
      .returning("id");
    const alloc = () =>
      testDb(T.creditAllocations).insert({
        job_id: job.id,
        grant_id: g.id,
        amount: 1,
        status: "reserved",
      });
    await alloc();
    await expect(alloc()).rejects.toMatchObject({ code: "23505" });
  });

  it("rejects a second plan grant for the same subscription", async () => {
    const u = await profile();
    const s = await subscription(u, await plan(), true);
    await grant(u, { subscription_id: s });
    await expect(grant(u, { subscription_id: s })).rejects.toMatchObject({
      code: "23505",
    });
  });

  it("rejects a duplicate paddle_event_id", async () => {
    const ev = {
      paddle_event_id: "evt_1",
      event_type: "x",
      occurred_at: now,
      payload: {},
    };
    await testDb(T.paymentEvents).insert(ev);
    await expect(testDb(T.paymentEvents).insert(ev)).rejects.toMatchObject({
      code: "23505",
    });
  });
});

describe("lockCatalogRow", () => {
  it("doesn't block a subscription insert that references the locked plan", async () => {
    const userId = await profile();
    const planId = await plan();
    await testDb.transaction(async (locker) => {
      await lockCatalogRow(locker, "plan", planId);
      // The FK check on plan_id takes FOR KEY SHARE on the plan row.
      await testDb.transaction(async (other) => {
        await other.raw("SET LOCAL lock_timeout = '500ms'");
        await other(T.subscriptions).insert({
          user_id: userId,
          plan_id: planId,
          next_plan_id: planId,
          status: "renewed",
          active: false,
          current_period_start: now,
          current_period_end: later,
        });
      });
    });
    expect(
      await testDb(T.subscriptions).where({ plan_id: planId }),
    ).toHaveLength(1);
  });

  it("rejects an unknown job status", async () => {
    const u = await profile();
    await expect(
      testDb(T.jobs).insert({
        user_id: u,
        model_key: "m",
        input: {},
        credit_cost: 1,
        status: "running",
        idempotency_key: "k",
        request_hash: "h",
      }),
    ).rejects.toMatchObject({ code: "23514" });
  });
});
