import type { Knex } from "knex";
import type { Deps } from "../../deps.js";
import type { PaddleEvent, PaddleTxn } from "../../clients/paddleEvents.js";
import { parsePaddleEvent } from "../../clients/paddleEvents.js";
import {
  getAddonById,
  getPlanById,
} from "../../db/repositories/catalog.repo.js";
import { insertCustomerAddon } from "../../db/repositories/customerAddons.repo.js";
import { insertGrant } from "../../db/repositories/credits.repo.js";
import {
  getInvoice,
  markInvoicePaid,
} from "../../db/repositories/invoices.repo.js";
import {
  markEventProcessed,
  recordPaymentEvent,
} from "../../db/repositories/paymentEvents.repo.js";
import { lockProfile } from "../../db/repositories/profiles.repo.js";
import { getActiveSubscription } from "../../db/repositories/subscriptions.repo.js";
import { addDays, addMonths } from "../../lib/time.js";
import { cancelReplacedSubscription } from "./paddleCancel.js";
import { getChangeType } from "./rules.js";
import { moveToPlan } from "./subscriptions.js";

const CANCEL_WAIT_MS = 3000;

// Task 12 replaces these stubs.
async function handleRenewal(): Promise<string[]> {
  return [];
}
async function handleSubscriptionEvent(): Promise<string[]> {
  return [];
}

export async function handlePaddleWebhook(
  deps: Deps,
  rawBody: string,
  signature: string | undefined,
): Promise<200 | 401> {
  if (!(await deps.paddle.verifyWebhook(rawBody, signature))) return 401;

  let json: unknown;
  let event: PaddleEvent;
  try {
    json = JSON.parse(rawBody);
    event = parsePaddleEvent(json);
  } catch (err) {
    deps.logger.error("Unparseable Paddle webhook", { err });
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
    if (txn.origin === "api") return completeCheckout(trx, deps, txn);
    if (txn.origin === "subscription_recurring") {
      return handleRenewal();
    }
  }
  if (event.kind === "subscription") {
    return handleSubscriptionEvent();
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
): Promise<string[]> {
  const invoiceId = txn.customData?.invoiceId;
  const invoice =
    typeof invoiceId === "string" ? await getInvoice(trx, invoiceId) : null;
  if (!invoice || txn.customData?.userId !== invoice.user_id) {
    deps.logger.error("Paddle transaction doesn't match one of our invoices", {
      transactionId: txn.id,
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
