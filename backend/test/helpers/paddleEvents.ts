import { createHmac, randomUUID } from "node:crypto";
import type { Express } from "express";
import request from "supertest";

export function signPaddle(
  rawBody: string,
  secret = "test_secret",
  ts = Math.floor(Date.now() / 1000),
): string {
  const h1 = createHmac("sha256", secret)
    .update(`${ts}:${rawBody}`)
    .digest("hex");
  return `ts=${ts};h1=${h1}`;
}

export function postPaddle(
  app: Express,
  payload: object,
  opts: { signature?: string } = {},
): Promise<request.Response> {
  const raw = JSON.stringify(payload);
  return request(app)
    .post("/webhooks/paddle")
    .set("Content-Type", "application/json")
    .set("Paddle-Signature", opts.signature ?? signPaddle(raw))
    .send(raw);
}

const eventId = () => `evt_${randomUUID()}`;

export function txnCompleted(p: {
  eventId?: string;
  occurredAt?: string;
  txnId?: string;
  origin?: string;
  subscriptionId?: string | null;
  customData?: Record<string, unknown> | null;
  priceId?: string;
  totalCents?: string;
  currency?: string;
  billingPeriod?: { startsAt: string; endsAt: string } | null;
}) {
  const bp =
    p.billingPeriod === undefined
      ? { startsAt: "2026-03-10T12:00:00Z", endsAt: "2026-04-10T12:00:00Z" }
      : p.billingPeriod;
  const currency = p.currency ?? "USD";
  return {
    event_id: p.eventId ?? eventId(),
    event_type: "transaction.completed",
    occurred_at: p.occurredAt ?? "2026-03-10T12:00:05Z",
    notification_id: `ntf_${randomUUID()}`,
    data: {
      id: p.txnId ?? `txn_${randomUUID()}`,
      status: "completed",
      origin: p.origin ?? "api",
      customer_id: "ctm_01",
      subscription_id:
        p.subscriptionId === undefined ? "sub_01" : p.subscriptionId,
      currency_code: currency,
      custom_data: p.customData === undefined ? {} : p.customData,
      items: [{ price: { id: p.priceId ?? "pri_01" }, quantity: 1 }],
      details: {
        totals: { total: p.totalCents ?? "1000", currency_code: currency },
      },
      billing_period: bp
        ? { starts_at: bp.startsAt, ends_at: bp.endsAt }
        : null,
    },
  };
}

type SubParams = {
  eventId?: string;
  occurredAt?: string;
  subscriptionId?: string;
  priceId?: string;
  scheduledChange?: { action: string; effectiveAt: string } | null;
  canceledAt?: string | null;
};

function subscriptionEvent(eventType: string, status: string, p: SubParams) {
  return {
    event_id: p.eventId ?? eventId(),
    event_type: eventType,
    occurred_at: p.occurredAt ?? "2026-03-15T09:00:00Z",
    notification_id: `ntf_${randomUUID()}`,
    data: {
      id: p.subscriptionId ?? "sub_01",
      status,
      customer_id: "ctm_01",
      canceled_at: p.canceledAt ?? null,
      items: [{ price: { id: p.priceId ?? "pri_01" }, quantity: 1 }],
      scheduled_change: p.scheduledChange
        ? {
            action: p.scheduledChange.action,
            effective_at: p.scheduledChange.effectiveAt,
            resume_at: null,
          }
        : null,
    },
  };
}

export const subscriptionUpdated = (p: SubParams & { status?: string } = {}) =>
  subscriptionEvent("subscription.updated", p.status ?? "active", p);

export const subscriptionCanceled = (p: SubParams = {}) =>
  subscriptionEvent("subscription.canceled", "canceled", {
    canceledAt: p.occurredAt ?? "2026-04-10T12:00:00Z",
    ...p,
  });

export const subscriptionPastDue = (p: SubParams = {}) =>
  subscriptionEvent("subscription.past_due", "past_due", p);

export const subscriptionPaused = (p: SubParams = {}) =>
  subscriptionEvent("subscription.paused", "paused", p);
