import type { Invoice } from "@/lib/api/billingTypes";
import { sleepUnlessAborted } from "@/lib/generate/pollJob";

export type PaymentResult = { kind: "paid"; invoice: Invoice } | { kind: "pending" };

/**
 * Paddle's checkout.completed arrives before our webhook, so the invoice shows
 * up a little later. Errors count as "not yet"; after timeoutMs the answer is
 * "pending", never "failed".
 */
export async function waitForPayment(
  transactionId: string,
  p: {
    listInvoices: () => Promise<Invoice[]>;
    intervalMs?: number;
    timeoutMs?: number;
    now?: () => number;
    sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
    signal?: AbortSignal;
  },
): Promise<PaymentResult> {
  const intervalMs = p.intervalMs ?? 2000;
  const timeoutMs = p.timeoutMs ?? 60000;
  const now = p.now ?? Date.now;
  const sleep = p.sleep ?? sleepUnlessAborted;
  const deadline = now() + timeoutMs;

  while (now() <= deadline) {
    try {
      const invoices = await p.listInvoices();
      const paid = invoices.find((invoice) => invoice.transactionId === transactionId && invoice.status === "paid");
      if (paid) return { kind: "paid", invoice: paid };
    } catch {
      // Not there yet; try again.
    }
    await sleep(intervalMs, p.signal);
  }
  return { kind: "pending" };
}
