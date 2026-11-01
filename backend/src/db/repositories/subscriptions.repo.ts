import type { Knex } from "knex";
import type { ActiveSubscription, SubscriptionRow } from "../rows.js";
import { T } from "../tables.js";
import { getPlanById } from "./catalog.repo.js";

type Db = Knex | Knex.Transaction;

export type NewSubscription = {
  user_id: string;
  plan_id: string;
  next_plan_id: string;
  current_period_start: Date;
  current_period_end: Date;
  previous_subscription_id: string | null;
  invoice_id: string | null;
  paddle_subscription_id: string | null;
  paddle_status: string | null;
  last_event_occurred_at: Date | null;
  created_at: Date;
};

async function withPlan(
  db: Db,
  row: SubscriptionRow | undefined,
): Promise<ActiveSubscription | null> {
  if (!row) return null;
  const plan = await getPlanById(db as Knex, row.plan_id);
  if (!plan) throw new Error(`Plan missing for subscription ${row.id}`);
  return { ...row, plan };
}

export async function getActiveSubscription(
  db: Db,
  userId: string,
): Promise<ActiveSubscription | null> {
  return withPlan(
    db,
    await db(T.subscriptions).where({ user_id: userId, active: true }).first(),
  );
}

export async function getActiveByPaddleSubscriptionId(
  db: Db,
  paddleSubscriptionId: string,
): Promise<ActiveSubscription | null> {
  return withPlan(
    db,
    await db(T.subscriptions)
      .where({ paddle_subscription_id: paddleSubscriptionId, active: true })
      .first(),
  );
}

export async function getLatestByPaddleSubscriptionId(
  db: Db,
  paddleSubscriptionId: string,
): Promise<SubscriptionRow | null> {
  return (
    (await db(T.subscriptions)
      .where({ paddle_subscription_id: paddleSubscriptionId })
      .orderBy("created_at", "desc")
      .first()) ?? null
  );
}

/** Returns null when the user already has an active row. */
export async function insertSubscription(
  trx: Knex.Transaction,
  row: NewSubscription,
): Promise<SubscriptionRow | null> {
  const { created_at, ...rest } = row;
  const rows: SubscriptionRow[] = await trx(T.subscriptions)
    .insert({
      ...rest,
      status: "active",
      active: true,
      started_at: created_at,
      created_at,
      updated_at: created_at,
    })
    .onConflict(trx.raw("(user_id) WHERE active"))
    .ignore()
    .returning("*");
  return rows[0] ?? null;
}

/** Closes the row only if it's still active; returns the closed row, or null if it wasn't. */
export async function closeSubscriptionRow(
  trx: Knex.Transaction,
  id: string,
  p: {
    status: "renewed" | "upgraded" | "downgraded" | "canceled";
    at: Date;
    paddleCancelPending: boolean;
  },
): Promise<SubscriptionRow | null> {
  const rows: SubscriptionRow[] = await trx(T.subscriptions)
    .where({ id, active: true })
    .update({
      status: p.status,
      active: false,
      canceled_at: p.at,
      current_period_end: trx.raw("LEAST(current_period_end, ?::timestamptz)", [
        p.at,
      ]),
      paddle_cancel_pending: p.paddleCancelPending,
      updated_at: p.at,
    })
    .returning("*");
  return rows[0] ?? null;
}

export async function setNextPlan(
  trx: Knex.Transaction,
  id: string,
  nextPlanId: string,
  now: Date,
): Promise<void> {
  await trx(T.subscriptions)
    .where("id", id)
    .update({ next_plan_id: nextPlanId, updated_at: now });
}

/** Applies a Paddle event only if it's newer than the last one applied. */
export async function applyPaddleState(
  trx: Knex.Transaction,
  id: string,
  p: { paddleStatus: string; nextPlanId: string | null; occurredAt: Date },
): Promise<boolean> {
  const n = await trx(T.subscriptions)
    .where("id", id)
    .andWhere(function () {
      this.whereNull("last_event_occurred_at").orWhere(
        "last_event_occurred_at",
        "<",
        p.occurredAt,
      );
    })
    .update({
      paddle_status: p.paddleStatus,
      next_plan_id: trx.raw("COALESCE(?::uuid, next_plan_id)", [p.nextPlanId]),
      last_event_occurred_at: p.occurredAt,
      updated_at: p.occurredAt,
    });
  return n > 0;
}

export async function getSubscriptionById(
  db: Db,
  id: string,
): Promise<SubscriptionRow | null> {
  return (await db(T.subscriptions).where({ id }).first()) ?? null;
}

export async function clearPendingCancel(
  db: Db,
  subscriptionId: string,
  now: Date,
): Promise<void> {
  await db(T.subscriptions)
    .where({ id: subscriptionId })
    .update({ paddle_cancel_pending: false, updated_at: now });
}
