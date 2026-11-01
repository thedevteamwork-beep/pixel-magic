import type { Knex } from "knex";
import { z } from "zod";
import type { Deps } from "../../deps.js";
import type {
  PaddleEvent,
  PaddleSub,
  PaddleTxn,
} from "../../clients/paddleEvents.js";
import { parsePaddleEvent } from "../../clients/paddleEvents.js";
import {
  getAddonById,
  getPlanById,
  getPlanByName,
  getPlanByPaddlePriceId,
} from "../../db/repositories/catalog.repo.js";
import { insertCustomerAddon } from "../../db/repositories/customerAddons.repo.js";
import { insertGrant } from "../../db/repositories/credits.repo.js";
import {
  centsToDollars,
  getInvoice,
  insertPaidInvoice,
  markInvoicePaid,
} from "../../db/repositories/invoices.repo.js";
import {
  markEventProcessed,
  recordPaymentEvent,
} from "../../db/repositories/paymentEvents.repo.js";
import { lockProfile } from "../../db/repositories/profiles.repo.js";
import {
  applyPaddleState,
  getActiveByPaddleSubscriptionId,
  getActiveSubscription,
  getLatestByPaddleSubscriptionId,
} from "../../db/repositories/subscriptions.repo.js";
import { addDays, addMonths } from "../../lib/time.js";
import { cancelReplacedSubscription } from "./paddleCancel.js";
import { getChangeType } from "./rules.js";
import { moveToPlan } from "./subscriptions.js";

const CANCEL_WAIT_MS = 3000;

const looseEnvelope = z.object({
  event_id: z.string().min(1),
  event_type: z.string().min(1),
  occurred_at: z.string().nullish(),
  data: z.object({ id: z.string().nullish() }).nullish(),
});
const uuid = z.string().uuid();

export async function handlePaddleWebhook(
  deps: Deps,
  rawBody: string,
  signature: string | undefined,
): Promise<200 | 401> {
  if (!(await deps.paddle.verifyWebhook(rawBody, signature))) return 401;

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch (err) {
    deps.logger.error("Unreadable Paddle webhook body", { err });
    return 200;
  }
  const loose = looseEnvelope.safeParse(json);
  if (!loose.success) {
    deps.logger.error("Paddle webhook without a readable envelope");
    return 200;
  }
  const env = loose.data;
  let event: PaddleEvent;
  try {
    event = parsePaddleEvent(json);
  } catch (err) {
    deps.logger.error("Unparseable Paddle webhook", {
      eventId: env.event_id,
      eventType: env.event_type,
      dataId: env.data?.id,
      err,
    });
    const occurred = new Date(env.occurred_at ?? deps.clock.now());
    await recordPaymentEvent(deps.db, {
      paddleEventId: env.event_id,
      eventType: env.event_type,
      occurredAt: Number.isNaN(occurred.getTime())
        ? deps.clock.now()
        : occurred,
      payload: json,
      createdAt: deps.clock.now(),
    });
    return 200;
  }

  const toCancel = await deps.db.transaction(async (trx) => {
    const isNew = await recordPaymentEvent(trx, {
      paddleEventId: event.eventId,
      eventType: event.eventType,
      occurredAt: event.occurredAt,
      payload: json,
      createdAt: deps.clock.now(),
    });
    if (!isNew) return [];
    const ids = await routeEvent(trx, deps, event);
    await markEventProcessed(trx, event.eventId, deps.clock.now());
    return ids;
  });

  if (toCancel.length > 0) {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, CANCEL_WAIT_MS);
    });
    await Promise.race([
      Promise.allSettled(
        toCancel.map((id) => cancelReplacedSubscription(deps, id)),
      ),
      timeout,
    ]);
    clearTimeout(timer);
  }
  return 200;
}

export async function routeEvent(
  trx: Knex.Transaction,
  deps: Deps,
  event: PaddleEvent,
): Promise<string[]> {
  if (
    event.kind === "transaction" &&
    event.eventType === "transaction.completed"
  ) {
    const { txn } = event;
    if (txn.origin === "api")
      return completeCheckout(trx, deps, txn, event.eventId);
    if (txn.origin === "subscription_recurring") {
      return handleRenewal(trx, deps, txn);
    }
  }
  if (event.kind === "subscription") {
    const { sub } = event;
    switch (event.eventType) {
      case "subscription.canceled":
        return handleSubscriptionCanceled(trx, deps, sub, event.occurredAt);
      case "subscription.updated":
      case "subscription.past_due":
        return handleSubscriptionUpdated(trx, deps, sub, event.occurredAt);
      case "subscription.paused":
        return handleSubscriptionPaused(trx, deps, sub, event.occurredAt);
    }
  }
  deps.logger.info("Paddle event recorded only", {
    eventId: event.eventId,
    eventType: event.eventType,
    origin: event.kind === "transaction" ? event.txn.origin : undefined,
  });
  return [];
}

export async function completeCheckout(
  trx: Knex.Transaction,
  deps: Deps,
  txn: PaddleTxn,
  eventId?: string,
): Promise<string[]> {
  const parsedId = uuid.safeParse(txn.customData?.invoiceId);
  const invoice = parsedId.success
    ? await getInvoice(trx, parsedId.data)
    : null;
  if (!invoice || txn.customData?.userId !== invoice.user_id) {
    deps.logger.error("Paddle transaction doesn't match one of our invoices", {
      transactionId: txn.id,
      eventId,
      invoiceId: txn.customData?.invoiceId,
      userId: txn.customData?.userId,
    });
    return [];
  }
  const now = deps.clock.now();
  const paid = await markInvoicePaid(trx, invoice.id, {
    paddleTransactionId: txn.id,
    paddleSubscriptionId: txn.subscriptionId,
    billingPeriod: txn.billingPeriod,
    origin: txn.origin,
    amountCents: txn.totalCents,
    currency: txn.currency,
    paidAt: now,
  });
  if (!paid) return [];

  if (invoice.item_type === "addon") {
    const addon = invoice.item_id
      ? await getAddonById(trx as Knex, invoice.item_id)
      : null;
    if (!addon) throw new Error(`Add-on missing for invoice ${invoice.id}`);
    const expires = addDays(now, addon.duration_days);
    const bought = await insertCustomerAddon(trx, {
      user_id: invoice.user_id,
      addon_id: addon.id,
      invoice_id: invoice.id,
      bought_at: now,
      expires_at: expires,
      created_at: now,
    });
    await insertGrant(trx, {
      user_id: invoice.user_id,
      kind: "addon",
      customer_addon_id: bought.id,
      total: addon.credits,
      starts_at: now,
      expires_at: expires,
      invoice_id: invoice.id,
      note: `${addon.name} add-on grant`,
      created_at: now,
    });
    return [];
  }

  const toPlan = invoice.item_id
    ? await getPlanById(trx as Knex, invoice.item_id)
    : null;
  if (!toPlan) throw new Error(`Plan missing for invoice ${invoice.id}`);
  if (!txn.subscriptionId) {
    throw new Error(`Plan checkout ${txn.id} has no Paddle subscription`);
  }
  await lockProfile(trx, invoice.user_id);
  const current = await getActiveSubscription(trx, invoice.user_id);
  if (!current)
    throw new Error(`No active subscription for ${invoice.user_id}`);
  const change = getChangeType(
    current.plan,
    toPlan,
    deps.config.FREE_PLAN_NAME,
  );
  const status = change === "downgrade" ? "downgraded" : "upgraded";
  const period =
    txn.billingPeriod ??
    ({
      startsAt: now,
      endsAt: addMonths(now, toPlan.interval === "yearly" ? 12 : 1),
    } as const);
  const flagged =
    !!current.paddle_subscription_id &&
    current.paddle_subscription_id !== txn.subscriptionId;
  await moveToPlan(trx, deps, {
    from: current,
    toPlan,
    status,
    t: now,
    periodStart: period.startsAt,
    periodEnd: period.endsAt,
    paddleSubscriptionId: txn.subscriptionId,
    invoiceId: invoice.id,
    paddleCancelPending: flagged,
  });
  return flagged ? [current.id] : [];
}

export async function handleRenewal(
  trx: Knex.Transaction,
  deps: Deps,
  txn: PaddleTxn,
): Promise<string[]> {
  const subId = txn.subscriptionId;
  const active = subId
    ? await getActiveByPaddleSubscriptionId(trx, subId)
    : null;
  const plan = txn.priceId
    ? await getPlanByPaddlePriceId(trx as Knex, txn.priceId)
    : null;
  const userId =
    active?.user_id ??
    (subId
      ? (await getLatestByPaddleSubscriptionId(trx, subId))?.user_id
      : null);
  if (!userId) {
    deps.logger.error("Renewal for an unknown Paddle subscription", {
      paddleSubscriptionId: subId,
      transactionId: txn.id,
    });
    return [];
  }
  const invoice = await insertPaidInvoice(trx, {
    user_id: userId,
    item_type: "plan",
    item_id: plan?.id ?? null,
    origin: txn.origin,
    paddle_transaction_id: txn.id,
    paddle_subscription_id: subId,
    amount: centsToDollars(txn.totalCents),
    currency: txn.currency,
    billing_period_start: txn.billingPeriod?.startsAt ?? null,
    billing_period_end: txn.billingPeriod?.endsAt ?? null,
    paid_at: deps.clock.now(),
  });
  if (!invoice) return [];
  if (!active || !subId) {
    deps.logger.error(
      "renewal charged on a subscription that is no longer active",
      { paddleSubscriptionId: subId, transactionId: txn.id },
    );
    return [];
  }
  const period = txn.billingPeriod;
  if (!period) {
    deps.logger.error("Renewal without a billing period", {
      transactionId: txn.id,
    });
    return [];
  }
  await lockProfile(trx, userId);
  const a = await getActiveByPaddleSubscriptionId(trx, subId);
  if (!a) {
    deps.logger.error(
      "renewal charged on a subscription that is no longer active",
      { paddleSubscriptionId: subId, transactionId: txn.id },
    );
    return [];
  }
  if (period.startsAt <= a.current_period_start) return [];
  if (!plan) {
    deps.logger.error("Renewal for an unknown Paddle price", {
      priceId: txn.priceId,
      transactionId: txn.id,
      paddleSubscriptionId: subId,
    });
    return [];
  }
  if (plan.id !== a.next_plan_id) {
    deps.logger.error("Renewal price differs from the scheduled next plan", {
      priceId: txn.priceId,
      nextPlanId: a.next_plan_id,
      transactionId: txn.id,
    });
  }
  await moveToPlan(trx, deps, {
    from: a,
    toPlan: plan,
    status: plan.id === a.plan_id ? "renewed" : "downgraded",
    t: period.startsAt,
    periodStart: period.startsAt,
    periodEnd: period.endsAt,
    paddleSubscriptionId: subId,
    invoiceId: invoice.id,
    paddleCancelPending: false,
  });
  return [];
}

export async function handleSubscriptionCanceled(
  trx: Knex.Transaction,
  deps: Deps,
  sub: PaddleSub,
  occurredAt: Date,
): Promise<string[]> {
  const found = await getActiveByPaddleSubscriptionId(trx, sub.id);
  if (!found) return [];
  await lockProfile(trx, found.user_id);
  const from = await getActiveByPaddleSubscriptionId(trx, sub.id);
  if (!from) return [];
  const free = await getPlanByName(trx as Knex, deps.config.FREE_PLAN_NAME);
  if (!free) throw new Error("Free plan missing; run npm run seed");
  const t = sub.canceledAt ?? occurredAt;
  await moveToPlan(trx, deps, {
    from,
    toPlan: free,
    status: "canceled",
    t,
    periodStart: t,
    periodEnd: addMonths(t, 1),
    paddleSubscriptionId: null,
    invoiceId: null,
    paddleCancelPending: false,
  });
  return [];
}

export async function handleSubscriptionUpdated(
  trx: Knex.Transaction,
  deps: Deps,
  sub: PaddleSub,
  occurredAt: Date,
): Promise<string[]> {
  const found = await getActiveByPaddleSubscriptionId(trx, sub.id);
  if (!found) return [];
  await lockProfile(trx, found.user_id);
  const row = await getActiveByPaddleSubscriptionId(trx, sub.id);
  if (!row) return [];
  let nextPlanId: string | null;
  if (sub.scheduledChange?.action === "cancel") {
    const free = await getPlanByName(trx as Knex, deps.config.FREE_PLAN_NAME);
    nextPlanId = free?.id ?? null;
  } else if (sub.priceId && sub.priceId === row.plan.paddle_price_id) {
    nextPlanId = row.plan_id;
  } else {
    const plan = sub.priceId
      ? await getPlanByPaddlePriceId(trx as Knex, sub.priceId)
      : null;
    nextPlanId = plan?.id ?? null;
    if (!plan) {
      deps.logger.error("Subscription update with an unknown Paddle price", {
        paddleSubscriptionId: sub.id,
        priceId: sub.priceId,
      });
    }
  }
  await applyPaddleState(trx, row.id, {
    paddleStatus: sub.status,
    nextPlanId,
    occurredAt,
  });
  return [];
}

async function handleSubscriptionPaused(
  trx: Knex.Transaction,
  deps: Deps,
  sub: PaddleSub,
  occurredAt: Date,
): Promise<string[]> {
  const found = await getActiveByPaddleSubscriptionId(trx, sub.id);
  if (!found) return [];
  await lockProfile(trx, found.user_id);
  const row = await getActiveByPaddleSubscriptionId(trx, sub.id);
  if (!row) return [];
  deps.logger.error("paused subscriptions are not supported", {
    paddleSubscriptionId: sub.id,
  });
  await applyPaddleState(trx, row.id, {
    paddleStatus: "paused",
    nextPlanId: null,
    occurredAt,
  });
  return [];
}
