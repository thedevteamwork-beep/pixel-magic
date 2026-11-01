import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  captureCredits,
  convertToCarryover,
  endGrantsOfSubscription,
  getCreditSummary,
  releaseCredits,
  reserveCredits,
} from "../../src/db/repositories/credits.repo.js";
import type { GrantRow, PlanWithCredits } from "../../src/db/rows.js";
import { T } from "../../src/db/tables.js";
import { AppError } from "../../src/lib/errors.js";
import { addDays, addMinutes } from "../../src/lib/time.js";
import { seedTestCatalog } from "../helpers/catalog.js";
import { resetDb, testDb } from "../helpers/db.js";
import {
  insertGrant,
  insertJob,
  insertProfile,
  insertSubscriptionRow,
} from "../helpers/factories.js";

const t0 = new Date("2026-03-10T12:00:00Z");
let plans: Record<string, PlanWithCredits>;
let userId: string;
let jobId: string;

beforeEach(async () => {
  await resetDb();
  ({ plans } = await seedTestCatalog(testDb));
  userId = await insertProfile(testDb);
  jobId = (await insertJob(testDb, userId)).id;
});
afterAll(() => testDb.destroy());

const tx = <T>(fn: (trx: import("knex").Knex.Transaction) => Promise<T>) =>
  testDb.transaction(fn);

const grantRow = (id: string): Promise<GrantRow> =>
  testDb(T.creditGrants).where({ id }).first();

async function subFor(planName: string, user = userId) {
  return insertSubscriptionRow(testDb, {
    user_id: user,
    plan_id: plans[planName].id,
  });
}

describe("reserveCredits", () => {
  it("spends plan grants first, then others by soonest expiry", async () => {
    const names = new Map<string, string>();
    const mk = async (
      name: string,
      kind: GrantRow["kind"],
      total: number,
      days: number,
    ) => {
      const g = await insertGrant(testDb, {
        user_id: userId,
        kind,
        total,
        expires_at: addDays(t0, days),
      });
      names.set(g.id, name);
    };
    await mk("addonA", "addon", 100, 5);
    await mk("P", "plan", 50, 20);
    await mk("C", "carryover", 30, 2);
    await mk("addonB", "addon", 100, 10);
    const a = await tx((trx) =>
      reserveCredits(trx, { userId, jobId, amount: 120, now: t0 }),
    );
    expect(a.map((x) => [names.get(x.grant_id), x.amount])).toEqual([
      ["P", 50],
      ["C", 30],
      ["addonA", 40],
    ]);
  });

  it("never spends expired or not-yet-started grants", async () => {
    await insertGrant(testDb, {
      user_id: userId,
      kind: "plan",
      total: 100,
      starts_at: addDays(t0, -30),
      expires_at: addMinutes(t0, -1),
    });
    await insertGrant(testDb, {
      user_id: userId,
      kind: "addon",
      total: 100,
      starts_at: addDays(t0, 1),
      expires_at: addDays(t0, 10),
    });
    const err = await tx((trx) =>
      reserveCredits(trx, { userId, jobId, amount: 1, now: t0 }),
    ).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err).toMatchObject({ status: 402, code: "INSUFFICIENT_CREDITS" });
  });

  it("rolls back fully when credits are short", async () => {
    await insertGrant(testDb, { user_id: userId, kind: "plan", total: 25 });
    await insertGrant(testDb, { user_id: userId, kind: "addon", total: 15 });
    await expect(
      tx((trx) => reserveCredits(trx, { userId, jobId, amount: 50, now: t0 })),
    ).rejects.toMatchObject({ status: 402, code: "INSUFFICIENT_CREDITS" });
    const grants = await testDb(T.creditGrants).where({ user_id: userId });
    expect(grants.map((g) => g.reserved)).toEqual([0, 0]);
    expect(await testDb(T.creditAllocations)).toHaveLength(0);
  });

  it("concurrent reservations never overspend", async () => {
    await insertGrant(testDb, { user_id: userId, kind: "manual", total: 100 });
    const jobs = await Promise.all(
      Array.from({ length: 10 }, () => insertJob(testDb, userId)),
    );
    const results = await Promise.allSettled(
      jobs.map((j) =>
        tx((trx) =>
          reserveCredits(trx, { userId, jobId: j.id, amount: 15, now: t0 }),
        ),
      ),
    );
    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    for (const r of results) {
      if (r.status === "rejected") {
        expect(r.reason).toMatchObject({ code: "INSUFFICIENT_CREDITS" });
      }
    }
    const grants = await testDb(T.creditGrants).where({ user_id: userId });
    const sumReserved = grants.reduce((s, g) => s + g.reserved, 0);
    expect(succeeded).toBe(6);
    expect(sumReserved).toBe(90);
  });

  it("job creation then reserve in one transaction neither deadlocks nor overspends", async () => {
    await insertGrant(testDb, { user_id: userId, kind: "manual", total: 100 });
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () =>
        tx(async (trx) => {
          const job = await insertJob(trx, userId);
          return reserveCredits(trx, {
            userId,
            jobId: job.id,
            amount: 15,
            now: t0,
          });
        }),
      ),
    );
    for (const r of results) {
      if (r.status === "rejected") {
        expect(r.reason).not.toMatchObject({ code: "40P01" });
        expect(r.reason).toMatchObject({ code: "INSUFFICIENT_CREDITS" });
      }
    }
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(6);
    const grants = await testDb(T.creditGrants).where({ user_id: userId });
    expect(grants.reduce((s, g) => s + g.reserved, 0)).toBe(90);
  });

  it("rejects a non-integer or non-positive amount", async () => {
    await insertGrant(testDb, { user_id: userId, kind: "manual", total: 100 });
    for (const amount of [0, -1, 1.5]) {
      await expect(
        tx((trx) => reserveCredits(trx, { userId, jobId, amount, now: t0 })),
      ).rejects.toThrow();
    }
  });
});

describe("captureCredits and releaseCredits", () => {
  it("capture moves reserved to used even after the grant expired", async () => {
    const g = await insertGrant(testDb, {
      user_id: userId,
      kind: "manual",
      total: 100,
      expires_at: addMinutes(t0, 10),
    });
    await tx((trx) =>
      reserveCredits(trx, { userId, jobId, amount: 30, now: t0 }),
    );
    // The grant expires while the job runs.
    const moved = await tx((trx) => captureCredits(trx, jobId));
    expect(moved).toBe(30);
    expect(await grantRow(g.id)).toMatchObject({ used: 30, reserved: 0 });
  });

  it("a second capture or a release after capture is a no-op", async () => {
    const g = await insertGrant(testDb, {
      user_id: userId,
      kind: "manual",
      total: 100,
    });
    await tx((trx) =>
      reserveCredits(trx, { userId, jobId, amount: 30, now: t0 }),
    );
    await tx((trx) => captureCredits(trx, jobId));
    expect(await tx((trx) => captureCredits(trx, jobId))).toBe(0);
    expect(await tx((trx) => releaseCredits(trx, jobId))).toBe(0);
    expect(await grantRow(g.id)).toMatchObject({ used: 30, reserved: 0 });
  });

  it("release gives credits back", async () => {
    const g = await insertGrant(testDb, {
      user_id: userId,
      kind: "manual",
      total: 100,
    });
    await tx((trx) =>
      reserveCredits(trx, { userId, jobId, amount: 30, now: t0 }),
    );
    expect(await tx((trx) => releaseCredits(trx, jobId))).toBe(30);
    expect(await grantRow(g.id)).toMatchObject({ used: 0, reserved: 0 });
    const allocs = await testDb(T.creditAllocations).where({ job_id: jobId });
    expect(allocs.map((a) => a.status)).toEqual(["released"]);
    const ledger = await testDb(T.creditLedger)
      .where({ job_id: jobId })
      .orderBy("created_at");
    expect(ledger.map((l) => l.type).sort()).toEqual(["release", "reserve"]);
  });
});

describe("convertToCarryover", () => {
  const convert = (closingSubscriptionId: string, t: Date) =>
    tx((trx) =>
      convertToCarryover(trx, {
        userId,
        closingSubscriptionId,
        t,
        carryoverDays: 30,
      }),
    );

  it("extends to at least t + 30 days and never shortens", async () => {
    const s1 = await subFor("starter_monthly");
    const s2 = await subFor("pro_yearly");
    const monthly = await insertGrant(testDb, {
      user_id: userId,
      kind: "plan",
      subscription_id: s1.id,
      total: 10,
      expires_at: addDays(t0, 5),
    });
    const yearly = await insertGrant(testDb, {
      user_id: userId,
      kind: "plan",
      subscription_id: s2.id,
      total: 10,
      expires_at: addDays(t0, 200),
    });
    expect(await convert(s1.id, t0)).toBe(2);
    expect(await grantRow(monthly.id)).toMatchObject({
      kind: "carryover",
      expires_at: addDays(t0, 30),
      converted_at: t0,
    });
    expect(await grantRow(yearly.id)).toMatchObject({
      kind: "carryover",
      expires_at: addDays(t0, 200),
      converted_at: t0,
    });
    const rows = await testDb(T.creditLedger).where({ type: "convert" });
    expect(rows).toHaveLength(2);
  });

  it("includes the closing row's already-expired grant", async () => {
    const s = await subFor("starter_monthly");
    const g = await insertGrant(testDb, {
      user_id: userId,
      kind: "plan",
      subscription_id: s.id,
      total: 10,
      expires_at: addMinutes(t0, -120),
    });
    expect(await convert(s.id, t0)).toBe(1);
    expect(await grantRow(g.id)).toMatchObject({
      kind: "carryover",
      expires_at: addDays(t0, 30),
    });
  });

  it("skips Free, addon, manual, carryover and other expired plan grants", async () => {
    const closing = await subFor("starter_monthly");
    const free = await subFor("free");
    const oldPaid = await subFor("pro_monthly");
    const carry = await subFor("pro_yearly");
    const mkPlan = (subscription_id: string, days: number) =>
      insertGrant(testDb, {
        user_id: userId,
        kind: "plan",
        subscription_id,
        total: 10,
        expires_at: addDays(t0, days),
      });
    const target = await mkPlan(closing.id, 5);
    const freeG = await mkPlan(free.id, 5);
    const expired = await mkPlan(oldPaid.id, -1);
    const carryG = await insertGrant(testDb, {
      user_id: userId,
      kind: "carryover",
      subscription_id: carry.id,
      total: 10,
      expires_at: addDays(t0, 3),
    });
    const addon = await insertGrant(testDb, {
      user_id: userId,
      kind: "addon",
      total: 10,
      expires_at: addDays(t0, 3),
    });
    const manual = await insertGrant(testDb, {
      user_id: userId,
      kind: "manual",
      total: 10,
      expires_at: addDays(t0, 3),
    });
    expect(await convert(closing.id, t0)).toBe(1);
    expect((await grantRow(target.id)).kind).toBe("carryover");
    for (const [g, kind] of [
      [freeG, "plan"],
      [expired, "plan"],
      [carryG, "carryover"],
      [addon, "addon"],
      [manual, "manual"],
    ] as const) {
      const row = await grantRow(g.id);
      expect(row.kind).toBe(kind);
      expect(row.expires_at).toEqual(g.expires_at);
      expect(row.converted_at).toBeNull();
    }
  });

  it("never chains", async () => {
    const s = await subFor("starter_monthly");
    const g = await insertGrant(testDb, {
      user_id: userId,
      kind: "plan",
      subscription_id: s.id,
      total: 10,
      expires_at: addDays(t0, 5),
    });
    expect(await convert(s.id, t0)).toBe(1);
    expect(await convert(s.id, addDays(t0, 10))).toBe(0);
    expect(await grantRow(g.id)).toMatchObject({
      kind: "carryover",
      expires_at: addDays(t0, 30),
      converted_at: t0,
    });
  });
});

describe("endGrantsOfSubscription", () => {
  it("shortens to now but never lengthens", async () => {
    const s1 = await subFor("starter_monthly");
    const s2 = await subFor("pro_monthly");
    const long = await insertGrant(testDb, {
      user_id: userId,
      kind: "plan",
      subscription_id: s1.id,
      total: 10,
      expires_at: addDays(t0, 20),
    });
    const past = await insertGrant(testDb, {
      user_id: userId,
      kind: "plan",
      subscription_id: s2.id,
      total: 10,
      expires_at: addDays(t0, -1),
    });
    await tx(async (trx) => {
      await endGrantsOfSubscription(trx, s1.id, t0);
      await endGrantsOfSubscription(trx, s2.id, t0);
    });
    expect((await grantRow(long.id)).expires_at).toEqual(t0);
    expect((await grantRow(past.id)).expires_at).toEqual(addDays(t0, -1));
    const adjusts = await testDb(T.creditLedger).where({ type: "adjust" });
    expect(adjusts).toHaveLength(1);
    expect(adjusts[0]).toMatchObject({
      grant_id: long.id,
      user_id: userId,
      amount: 10,
      note: "grant ended early",
    });
    expect(adjusts[0].created_at).toEqual(t0);
  });
});

describe("getCreditSummary", () => {
  it("summarises available, reserved and grants in spending order", async () => {
    await insertGrant(testDb, {
      user_id: userId,
      kind: "addon",
      total: 100,
      expires_at: addDays(t0, 5),
    });
    await insertGrant(testDb, {
      user_id: userId,
      kind: "plan",
      total: 50,
      expires_at: addDays(t0, 20),
    });
    await insertGrant(testDb, {
      user_id: userId,
      kind: "manual",
      total: 10,
      expires_at: addMinutes(t0, -5),
    });
    await tx((trx) =>
      reserveCredits(trx, { userId, jobId, amount: 60, now: t0 }),
    );
    const s = await getCreditSummary(testDb, userId, t0);
    expect(s.available).toBe(90);
    expect(s.reserved).toBe(60);
    expect(s.grants).toEqual([
      { kind: "plan", remaining: 0, expiresAt: addDays(t0, 20) },
      { kind: "addon", remaining: 90, expiresAt: addDays(t0, 5) },
    ]);
  });
});
