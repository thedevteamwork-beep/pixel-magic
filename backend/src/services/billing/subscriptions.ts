import type { Knex } from "knex";
import type { Deps } from "../../deps.js";
import {
  convertToCarryover,
  endGrantsOfSubscription,
  insertGrant,
} from "../../db/repositories/credits.repo.js";
import { getPlanByName } from "../../db/repositories/catalog.repo.js";
import {
  lockProfile,
  upsertProfile,
} from "../../db/repositories/profiles.repo.js";
import {
  closeSubscriptionRow,
  getActiveSubscription,
  insertSubscription,
} from "../../db/repositories/subscriptions.repo.js";
import type {
  ActiveSubscription,
  PlanWithCredits,
  SubscriptionRow,
} from "../../db/rows.js";
import { addMonths } from "../../lib/time.js";
import { planGrantExpiry } from "./rules.js";

/** The row to move was already closed by someone else; the caller's snapshot is stale. */
export class StaleSubscriptionError extends Error {
  constructor(subscriptionId: string) {
    super(`Subscription ${subscriptionId} is no longer active`);
    this.name = "StaleSubscriptionError";
  }
}

export type OpenParams = {
  userId: string;
  plan: PlanWithCredits;
  periodStart: Date;
  periodEnd: Date;
  paddleSubscriptionId?: string | null;
  invoiceId?: string | null;
  previousSubscriptionId?: string | null;
  lastEventOccurredAt?: Date | null;
  paddleStatus?: string | null;
};

export type MoveParams = {
  from: ActiveSubscription;
  toPlan: PlanWithCredits;
  status: "renewed" | "upgraded" | "downgraded" | "canceled";
  t: Date;
  periodStart: Date;
  periodEnd: Date;
  paddleSubscriptionId: string | null;
  invoiceId: string | null;
  paddleCancelPending: boolean;
};

/** Like openSubscription, but returns null if the user already has an active row. */
async function tryOpenSubscription(
  trx: Knex.Transaction,
  deps: Deps,
  p: OpenParams,
): Promise<SubscriptionRow | null> {
  const now = deps.clock.now();
  const sub = await insertSubscription(trx, {
    user_id: p.userId,
    plan_id: p.plan.id,
    next_plan_id: p.plan.id,
    current_period_start: p.periodStart,
    current_period_end: p.periodEnd,
    previous_subscription_id: p.previousSubscriptionId ?? null,
    invoice_id: p.invoiceId ?? null,
    paddle_subscription_id: p.paddleSubscriptionId ?? null,
    paddle_status: p.paddleStatus ?? null,
    last_event_occurred_at: p.lastEventOccurredAt ?? null,
    created_at: now,
  });
  if (!sub) return null;
  await insertGrant(trx, {
    user_id: p.userId,
    kind: "plan",
    subscription_id: sub.id,
    total: p.plan.credits,
    starts_at: p.periodStart,
    expires_at: planGrantExpiry(
      p.plan,
      p.periodStart,
      p.periodEnd,
      deps.config.RENEWAL_GRACE_MINUTES,
    ),
    invoice_id: p.invoiceId ?? undefined,
    note: `${p.plan.name} plan grant`,
    created_at: now,
  });
  return sub;
}

export async function openSubscription(
  trx: Knex.Transaction,
  deps: Deps,
  p: OpenParams,
): Promise<SubscriptionRow> {
  const sub = await tryOpenSubscription(trx, deps, p);
  if (!sub) {
    throw new Error(`User ${p.userId} already has an active subscription`);
  }
  return sub;
}

export async function ensureUser(
  deps: Deps,
  user: { id: string; email: string | null },
): Promise<void> {
  // Fast path: an existing user has a profile and an active row.
  if (await getActiveSubscription(deps.db, user.id)) return;
  await deps.db.transaction(async (trx) => {
    await upsertProfile(trx, user);
    await lockProfile(trx, user.id);
    if (await getActiveSubscription(trx, user.id)) return;
    const plan = await getPlanByName(trx, deps.config.FREE_PLAN_NAME);
    if (!plan) throw new Error("Free plan missing; run npm run seed");
    const now = deps.clock.now();
    await tryOpenSubscription(trx, deps, {
      userId: user.id,
      plan,
      periodStart: now,
      periodEnd: addMonths(now, 1),
    });
  });
}

export async function moveToPlan(
  trx: Knex.Transaction,
  deps: Deps,
  p: MoveParams,
): Promise<SubscriptionRow> {
  const { from } = p;
  await lockProfile(trx, from.user_id);
  const closed = await closeSubscriptionRow(trx, from.id, {
    status: p.status,
    at: p.t,
    paddleCancelPending: p.paddleCancelPending,
  });
  if (!closed) throw new StaleSubscriptionError(from.id);
  const fromFree = from.plan.name === deps.config.FREE_PLAN_NAME;
  if (fromFree && p.status !== "renewed") {
    await endGrantsOfSubscription(trx, from.id, p.t);
  } else if (
    !fromFree &&
    (p.status === "upgraded" || p.status === "downgraded")
  ) {
    await convertToCarryover(trx, {
      userId: from.user_id,
      closingSubscriptionId: from.id,
      t: p.t,
      carryoverDays: deps.config.CARRYOVER_VALIDITY_DAYS,
    });
  }
  const samePaddle =
    p.paddleSubscriptionId !== null &&
    p.paddleSubscriptionId === closed.paddle_subscription_id;
  return openSubscription(trx, deps, {
    userId: from.user_id,
    plan: p.toPlan,
    periodStart: p.periodStart,
    periodEnd: p.periodEnd,
    paddleSubscriptionId: p.paddleSubscriptionId,
    invoiceId: p.invoiceId,
    previousSubscriptionId: from.id,
    lastEventOccurredAt: samePaddle ? closed.last_event_occurred_at : null,
    paddleStatus: samePaddle ? closed.paddle_status : null,
  });
}
