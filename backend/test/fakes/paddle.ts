import { Paddle } from "@paddle/paddle-node-sdk";
import {
  PaddleProviderError,
  type PaddleClient,
  type PaddleSubscriptionState,
} from "../../src/clients/paddle.js";

const WEBHOOK_SECRET = "test_secret";

type Method = keyof PaddleClient;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class FakePaddle implements PaddleClient {
  calls: Array<{ method: string; args: unknown[] }> = [];
  subscriptions = new Map<string, PaddleSubscriptionState>();

  private latency = 0;
  private failures = new Map<Method, number>();
  private hangs = new Map<Method, number>();
  private counters = { ctm: 0, pro: 0, pri: 0, txn: 0 };
  private sdk = new Paddle("fake-api-key");

  failNext(method: Method, times = 1): void {
    this.failures.set(method, times);
  }

  hangNext(method: Method, ms: number): void {
    this.hangs.set(method, ms);
  }

  delay(ms: number): void {
    this.latency = ms;
  }

  callsTo(method: Method): Array<{ method: string; args: unknown[] }> {
    return this.calls.filter((c) => c.method === method);
  }

  private nextId(kind: keyof FakePaddle["counters"]): string {
    this.counters[kind] += 1;
    return `${kind}_${this.counters[kind]}`;
  }

  private async enter(method: Method, args: unknown[]): Promise<void> {
    this.calls.push({ method, args });
    if (this.latency > 0) await sleep(this.latency);
    const hang = this.hangs.get(method);
    if (hang !== undefined) {
      this.hangs.delete(method);
      await sleep(hang);
    }
    const remaining = this.failures.get(method) ?? 0;
    if (remaining > 0) {
      this.failures.set(method, remaining - 1);
      throw new PaddleProviderError(`fake Paddle ${method} failure`);
    }
  }

  private sub(id: string): PaddleSubscriptionState {
    const s = this.subscriptions.get(id);
    if (!s) throw new PaddleProviderError(`subscription ${id} not found`);
    return s;
  }

  async createCustomer(email: string | null): Promise<{ id: string }> {
    await this.enter("createCustomer", [email]);
    return { id: this.nextId("ctm") };
  }

  async createProduct(p: {
    name: string;
    customData: Record<string, string>;
  }): Promise<{ id: string }> {
    await this.enter("createProduct", [p]);
    return { id: this.nextId("pro") };
  }

  async createPrice(p: {
    productId: string;
    name: string;
    amountCents: string;
    currency: string;
    interval: "month" | "year" | null;
  }): Promise<{ id: string }> {
    await this.enter("createPrice", [p]);
    return { id: this.nextId("pri") };
  }

  async createTransaction(p: {
    customerId: string;
    priceId: string;
    customData: Record<string, string>;
  }): Promise<{ id: string; checkoutUrl: string | null }> {
    await this.enter("createTransaction", [p]);
    const id = this.nextId("txn");
    return { id, checkoutUrl: `https://checkout.test/${id}` };
  }

  async getSubscription(id: string): Promise<PaddleSubscriptionState> {
    await this.enter("getSubscription", [id]);
    return { ...this.sub(id) };
  }

  async updateSubscriptionPrice(id: string, priceId: string): Promise<void> {
    await this.enter("updateSubscriptionPrice", [id, priceId]);
    this.subscriptions.set(id, { ...this.sub(id), priceId });
  }

  async removeScheduledChange(id: string): Promise<void> {
    await this.enter("removeScheduledChange", [id]);
    this.subscriptions.set(id, { ...this.sub(id), scheduledChange: null });
  }

  async cancelSubscription(
    id: string,
    effectiveFrom: "immediately" | "next_billing_period",
  ): Promise<void> {
    await this.enter("cancelSubscription", [id, effectiveFrom]);
    const s = this.sub(id);
    if (effectiveFrom === "immediately") {
      this.subscriptions.set(id, {
        ...s,
        status: "canceled",
        scheduledChange: null,
      });
    } else {
      this.subscriptions.set(id, {
        ...s,
        scheduledChange: {
          action: "cancel",
          effectiveAt: s.periodEnd ?? new Date(0),
        },
      });
    }
  }

  async verifyWebhook(
    rawBody: string,
    signature: string | undefined,
  ): Promise<boolean> {
    await this.enter("verifyWebhook", [rawBody, signature]);
    if (!signature) return false;
    try {
      return Boolean(
        await this.sdk.webhooks.unmarshal(rawBody, WEBHOOK_SECRET, signature),
      );
    } catch {
      return false;
    }
  }
}
