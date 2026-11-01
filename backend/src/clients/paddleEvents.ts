import { z } from "zod";

export type PaddleTxn = {
  id: string;
  origin: string;
  status: string;
  subscriptionId: string | null;
  customData: Record<string, unknown> | null;
  priceId: string | null;
  totalCents: string;
  currency: string;
  billingPeriod: { startsAt: Date; endsAt: Date } | null;
};

export type PaddleSub = {
  id: string;
  status: string;
  priceId: string | null;
  scheduledChange: { action: string; effectiveAt: Date } | null;
  canceledAt: Date | null;
};

export type PaddleEvent = {
  eventId: string;
  eventType: string;
  occurredAt: Date;
} & (
  | { kind: "transaction"; txn: PaddleTxn }
  | { kind: "subscription"; sub: PaddleSub }
  | { kind: "other" }
);

const date = z.string().transform((s, ctx) => {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    ctx.addIssue({ code: "custom", message: "invalid date" });
    return z.NEVER;
  }
  return d;
});

const envelope = z.object({
  event_id: z.string().min(1),
  event_type: z.string().min(1),
  occurred_at: date,
  data: z.unknown(),
});

const items = z
  .array(z.object({ price: z.object({ id: z.string() }).nullish() }))
  .nullish();

const txnData = z
  .object({
    id: z.string(),
    status: z.string(),
    origin: z.string(),
    subscription_id: z.string().nullish(),
    custom_data: z.record(z.string(), z.unknown()).nullish(),
    currency_code: z.string(),
    items,
    details: z.object({ totals: z.object({ total: z.string() }) }),
    billing_period: z.object({ starts_at: date, ends_at: date }).nullish(),
  })
  .transform((d): PaddleTxn => ({
    id: d.id,
    origin: d.origin,
    status: d.status,
    subscriptionId: d.subscription_id ?? null,
    customData: d.custom_data ?? null,
    priceId: d.items?.[0]?.price?.id ?? null,
    totalCents: d.details.totals.total,
    currency: d.currency_code,
    billingPeriod: d.billing_period
      ? {
          startsAt: d.billing_period.starts_at,
          endsAt: d.billing_period.ends_at,
        }
      : null,
  }));

const subData = z
  .object({
    id: z.string(),
    status: z.string(),
    items,
    scheduled_change: z
      .object({ action: z.string(), effective_at: date })
      .nullish(),
    canceled_at: date.nullish(),
  })
  .transform((d): PaddleSub => ({
    id: d.id,
    status: d.status,
    priceId: d.items?.[0]?.price?.id ?? null,
    scheduledChange: d.scheduled_change
      ? {
          action: d.scheduled_change.action,
          effectiveAt: d.scheduled_change.effective_at,
        }
      : null,
    canceledAt: d.canceled_at ?? null,
  }));

export function parsePaddleEvent(json: unknown): PaddleEvent {
  const e = envelope.parse(json);
  const base = {
    eventId: e.event_id,
    eventType: e.event_type,
    occurredAt: e.occurred_at,
  };
  if (e.event_type.startsWith("transaction.")) {
    return { ...base, kind: "transaction", txn: txnData.parse(e.data) };
  }
  if (e.event_type.startsWith("subscription.")) {
    return { ...base, kind: "subscription", sub: subData.parse(e.data) };
  }
  return { ...base, kind: "other" };
}
