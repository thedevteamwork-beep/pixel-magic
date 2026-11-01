import {
  ApiError,
  Environment,
  Paddle,
  type CurrencyCode,
  type Subscription,
} from "@paddle/paddle-node-sdk";
import type { Config } from "../config.js";

export type PaddleSubscriptionState = {
  id: string;
  status: string;
  priceId: string | null;
  periodEnd: Date | null;
  scheduledChange: {
    action: "cancel" | "pause" | "resume";
    effectiveAt: Date;
  } | null;
};

export interface PaddleClient {
  createCustomer(email: string | null): Promise<{ id: string }>;
  createProduct(p: {
    name: string;
    customData: Record<string, string>;
  }): Promise<{ id: string }>;
  createPrice(p: {
    productId: string;
    name: string;
    amountCents: string;
    currency: string;
    interval: "month" | "year" | null;
  }): Promise<{ id: string }>;
  createTransaction(p: {
    customerId: string;
    priceId: string;
    customData: Record<string, string>;
  }): Promise<{ id: string; checkoutUrl: string | null }>;
  getSubscription(id: string): Promise<PaddleSubscriptionState>;
  updateSubscriptionPrice(id: string, priceId: string): Promise<void>;
  removeScheduledChange(id: string): Promise<void>;
  cancelSubscription(
    id: string,
    effectiveFrom: "immediately" | "next_billing_period",
  ): Promise<void>;
  verifyWebhook(
    rawBody: string,
    signature: string | undefined,
  ): Promise<boolean>;
}

export class PaddleProviderError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "PaddleProviderError";
  }
}

async function wrap<T>(op: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof PaddleProviderError) throw err;
    const detail = err instanceof Error ? err.message : String(err);
    throw new PaddleProviderError(`Paddle ${op} failed: ${detail}`, {
      cause: err,
    });
  }
}

function toState(s: Subscription): PaddleSubscriptionState {
  return {
    id: s.id,
    status: s.status,
    priceId: s.items[0]?.price?.id ?? null,
    periodEnd: s.currentBillingPeriod
      ? new Date(s.currentBillingPeriod.endsAt)
      : null,
    scheduledChange: s.scheduledChange
      ? {
          action: s.scheduledChange.action,
          effectiveAt: new Date(s.scheduledChange.effectiveAt),
        }
      : null,
  };
}

export function createPaddleClient(config: Config): PaddleClient {
  const paddle = new Paddle(config.PADDLE_API_KEY, {
    environment:
      config.PADDLE_ENV === "production"
        ? Environment.production
        : Environment.sandbox,
  });

  return {
    createCustomer: (email) =>
      wrap("createCustomer", async () => {
        try {
          const c = await paddle.customers.create({ email: email as string });
          return { id: c.id };
        } catch (err) {
          if (
            email &&
            err instanceof ApiError &&
            (err.code === "customer_already_exists" || err.code === "conflict")
          ) {
            const existing = await paddle.customers
              .list({ email: [email] })
              .next();
            const first = existing[0];
            if (first) return { id: first.id };
          }
          throw err;
        }
      }),
    createProduct: ({ name, customData }) =>
      wrap("createProduct", async () => {
        const p = await paddle.products.create({
          name,
          taxCategory: "standard",
          customData,
        });
        return { id: p.id };
      }),
    createPrice: ({ productId, name, amountCents, currency, interval }) =>
      wrap("createPrice", async () => {
        const p = await paddle.prices.create({
          productId,
          name,
          description: name,
          unitPrice: {
            amount: amountCents,
            currencyCode: currency as CurrencyCode,
          },
          ...(interval ? { billingCycle: { interval, frequency: 1 } } : {}),
        });
        return { id: p.id };
      }),
    createTransaction: ({ customerId, priceId, customData }) =>
      wrap("createTransaction", async () => {
        const t = await paddle.transactions.create({
          items: [{ priceId, quantity: 1 }],
          customerId,
          customData,
          collectionMode: "automatic",
        });
        return { id: t.id, checkoutUrl: t.checkout?.url ?? null };
      }),
    getSubscription: (id) =>
      wrap("getSubscription", async () =>
        toState(await paddle.subscriptions.get(id)),
      ),
    updateSubscriptionPrice: (id, priceId) =>
      wrap("updateSubscriptionPrice", async () => {
        await paddle.subscriptions.update(id, {
          items: [{ priceId, quantity: 1 }],
          prorationBillingMode: "do_not_bill",
        });
      }),
    removeScheduledChange: (id) =>
      wrap("removeScheduledChange", async () => {
        await paddle.subscriptions.update(id, { scheduledChange: null });
      }),
    cancelSubscription: (id, effectiveFrom) =>
      wrap("cancelSubscription", async () => {
        await paddle.subscriptions.cancel(id, { effectiveFrom });
      }),
    verifyWebhook: async (rawBody, signature) => {
      if (!signature) return false;
      try {
        return Boolean(
          await paddle.webhooks.isSignatureValid(
            rawBody,
            config.PADDLE_WEBHOOK_SECRET,
            signature,
          ),
        );
      } catch {
        return false;
      }
    },
  };
}
