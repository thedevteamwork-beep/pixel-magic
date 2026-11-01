import type { Knex } from "knex";
import { AppError } from "../../lib/errors.js";
import type { AllocationRow, GrantRow } from "../rows.js";
import { T } from "../tables.js";
import { lockProfile } from "./profiles.repo.js";

type Db = Knex | Knex.Transaction;

/** The order grants are spent in (plans spec §5.2). */
const SPENDING_ORDER = "(kind <> 'plan'), expires_at, created_at";

export type NewGrant = {
  user_id: string;
  kind: GrantRow["kind"];
  subscription_id?: string;
  customer_addon_id?: string;
  total: number;
  starts_at: Date;
  expires_at: Date;
  invoice_id?: string;
  note?: string;
  created_at: Date;
};

export async function insertGrant(db: Db, g: NewGrant): Promise<GrantRow> {
  const [row] = await db(T.creditGrants)
    .insert({
      user_id: g.user_id,
      kind: g.kind,
      subscription_id: g.subscription_id ?? null,
      customer_addon_id: g.customer_addon_id ?? null,
      total: g.total,
      starts_at: g.starts_at,
      expires_at: g.expires_at,
      created_at: g.created_at,
      updated_at: g.created_at,
    })
    .returning("*");
  await db(T.creditLedger).insert({
    user_id: g.user_id,
    grant_id: row.id,
    invoice_id: g.invoice_id ?? null,
    type: "grant",
    amount: g.total,
    note: g.note ?? null,
    created_at: g.created_at,
  });
  return row;
}

export async function reserveCredits(
  trx: Knex.Transaction,
  p: { userId: string; jobId: string; amount: number; now: Date },
): Promise<AllocationRow[]> {
  if (!Number.isInteger(p.amount) || p.amount <= 0) {
    throw new Error(`Reserve amount must be a positive integer: ${p.amount}`);
  }
  await lockProfile(trx, p.userId);
  const grants: GrantRow[] = await trx(T.creditGrants)
    .where("user_id", p.userId)
    .andWhere("starts_at", "<=", p.now)
    .andWhere("expires_at", ">", p.now)
    .andWhereRaw("total - used - reserved > 0")
    .orderByRaw(SPENDING_ORDER)
    .forUpdate();

  let left = p.amount;
  const takes: { grant: GrantRow; amount: number }[] = [];
  for (const grant of grants) {
    if (left === 0) break;
    const amount = Math.min(left, grant.total - grant.used - grant.reserved);
    takes.push({ grant, amount });
    left -= amount;
  }
  if (left > 0) {
    throw new AppError(402, "INSUFFICIENT_CREDITS", "Not enough credits");
  }

  const allocations: AllocationRow[] = [];
  for (const { grant, amount } of takes) {
    await trx(T.creditGrants)
      .where("id", grant.id)
      .update({
        reserved: trx.raw("reserved + ?", [amount]),
        updated_at: p.now,
      });
    const [alloc] = await trx(T.creditAllocations)
      .insert({
        job_id: p.jobId,
        grant_id: grant.id,
        amount,
        status: "reserved",
        created_at: p.now,
        updated_at: p.now,
      })
      .returning("*");
    allocations.push(alloc);
    await trx(T.creditLedger).insert({
      user_id: p.userId,
      grant_id: grant.id,
      job_id: p.jobId,
      type: "reserve",
      amount,
      created_at: p.now,
    });
  }
  return allocations;
}

/**
 * Moves a job's reserved allocations to `to`. Compare-and-set on
 * status = 'reserved', so a replay finds nothing and returns 0.
 */
async function settleAllocations(
  trx: Knex.Transaction,
  jobId: string,
  to: "captured" | "released",
): Promise<number> {
  const job = await trx(T.jobs).where("id", jobId).first("user_id");
  if (!job) return 0;
  await lockProfile(trx, job.user_id);
  const moved: { grant_id: string; amount: number }[] = await trx(
    T.creditAllocations,
  )
    .where({ job_id: jobId, status: "reserved" })
    .update({ status: to })
    .returning(["grant_id", "amount"]);
  moved.sort((a, b) => a.grant_id.localeCompare(b.grant_id));
  let total = 0;
  for (const { grant_id, amount } of moved) {
    await trx(T.creditGrants)
      .where("id", grant_id)
      .update(
        to === "captured"
          ? {
              reserved: trx.raw("reserved - ?", [amount]),
              used: trx.raw("used + ?", [amount]),
            }
          : { reserved: trx.raw("reserved - ?", [amount]) },
      );
    await trx(T.creditLedger).insert({
      user_id: job.user_id,
      grant_id,
      job_id: jobId,
      type: to === "captured" ? "capture" : "release",
      amount,
    });
    total += amount;
  }
  return total;
}

export function captureCredits(
  trx: Knex.Transaction,
  jobId: string,
): Promise<number> {
  return settleAllocations(trx, jobId, "captured");
}

export function releaseCredits(
  trx: Knex.Transaction,
  jobId: string,
): Promise<number> {
  return settleAllocations(trx, jobId, "released");
}

export async function convertToCarryover(
  trx: Knex.Transaction,
  p: {
    userId: string;
    closingSubscriptionId: string;
    t: Date;
    carryoverDays: number;
  },
): Promise<number> {
  await lockProfile(trx, p.userId);
  const converted: { rows: { id: string; remaining: number }[] } =
    await trx.raw(
      `UPDATE ?? g
          SET kind = 'carryover',
              converted_at = ?::timestamptz,
              updated_at = ?::timestamptz,
              expires_at = GREATEST(
                g.expires_at,
                ?::timestamptz + make_interval(days => ?::int))
        WHERE g.user_id = ? AND g.kind = 'plan'
          AND (g.expires_at > ?::timestamptz OR g.subscription_id = ?)
          AND g.subscription_id IN (
            SELECT s.id FROM ?? s JOIN ?? pl ON pl.id = s.plan_id
             WHERE s.user_id = ? AND pl.amount > 0)
        RETURNING g.id, g.total - g.used - g.reserved AS remaining`,
      [
        T.creditGrants,
        p.t,
        p.t,
        p.t,
        p.carryoverDays,
        p.userId,
        p.t,
        p.closingSubscriptionId,
        T.subscriptions,
        T.plans,
        p.userId,
      ],
    );
  for (const g of converted.rows) {
    await trx(T.creditLedger).insert({
      user_id: p.userId,
      grant_id: g.id,
      type: "convert",
      amount: g.remaining,
      note: "plan grant converted to carryover",
      created_at: p.t,
    });
  }
  return converted.rows.length;
}

export async function endGrantsOfSubscription(
  trx: Knex.Transaction,
  subscriptionId: string,
  now: Date,
): Promise<void> {
  const sub = await trx(T.subscriptions)
    .where("id", subscriptionId)
    .first("user_id");
  if (!sub) return;
  await lockProfile(trx, sub.user_id);
  const ending: GrantRow[] = await trx(T.creditGrants)
    .where("subscription_id", subscriptionId)
    .andWhere("expires_at", ">", now)
    .forUpdate();
  for (const g of ending) {
    await trx(T.creditGrants)
      .where("id", g.id)
      .update({ expires_at: now, updated_at: now });
    await trx(T.creditLedger).insert({
      user_id: sub.user_id,
      grant_id: g.id,
      type: "adjust",
      amount: g.total - g.used - g.reserved,
      note: "grant ended early",
      created_at: now,
    });
  }
}

export type CreditSummary = {
  available: number;
  reserved: number;
  grants: { kind: GrantRow["kind"]; remaining: number; expiresAt: Date }[];
};

export async function getCreditSummary(
  db: Db,
  userId: string,
  now: Date,
): Promise<CreditSummary> {
  const spendable: GrantRow[] = await db(T.creditGrants)
    .where("user_id", userId)
    .andWhere("starts_at", "<=", now)
    .andWhere("expires_at", ">", now)
    .orderByRaw(SPENDING_ORDER);
  const grants = spendable.map((g) => ({
    kind: g.kind,
    remaining: g.total - g.used - g.reserved,
    expiresAt: g.expires_at,
  }));
  const r = await db(T.creditGrants)
    .where("user_id", userId)
    .sum({ reserved: "reserved" })
    .first();
  return {
    available: grants.reduce((s, g) => s + g.remaining, 0),
    reserved: Number(r?.reserved ?? 0),
    grants,
  };
}
