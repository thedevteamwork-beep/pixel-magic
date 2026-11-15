import { describe, expect, it, vi } from "vitest";
import type { Invoice } from "@/lib/api/billingTypes";
import { waitForPayment } from "@/lib/billing/waitForPayment";

function invoice(over: Partial<Invoice> = {}): Invoice {
  return {
    id: "inv_1",
    transactionId: "txn_1",
    itemType: "plan",
    item: "Pro",
    amount: "10.00",
    currency: "USD",
    status: "paid",
    paidAt: "2026-11-09T00:00:00.000Z",
    ...over,
  };
}

function fakeClock() {
  let t = 0;
  return {
    now: () => t,
    sleep: async (ms: number) => {
      t += ms;
    },
  };
}

describe("waitForPayment", () => {
  it("returns paid when the invoice appears on the 3rd call", async () => {
    const clock = fakeClock();
    const listInvoices = vi
      .fn<() => Promise<Invoice[]>>()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([invoice()]);
    const result = await waitForPayment("txn_1", { listInvoices, ...clock });
    expect(result).toEqual({ kind: "paid", invoice: invoice() });
    expect(listInvoices).toHaveBeenCalledTimes(3);
  });

  it("returns pending after the timeout and starts no call after the deadline", async () => {
    const clock = fakeClock();
    const callTimes: number[] = [];
    const listInvoices = async () => {
      callTimes.push(clock.now());
      return [];
    };
    const result = await waitForPayment("txn_1", { listInvoices, ...clock });
    expect(result).toEqual({ kind: "pending" });
    expect(callTimes.length).toBeGreaterThan(1);
    expect(Math.max(...callTimes)).toBeLessThanOrEqual(60000);
  });

  it("treats errors as not yet", async () => {
    const clock = fakeClock();
    const listInvoices = vi
      .fn<() => Promise<Invoice[]>>()
      .mockRejectedValueOnce(new Error("a"))
      .mockRejectedValueOnce(new Error("b"))
      .mockResolvedValueOnce([invoice()]);
    const result = await waitForPayment("txn_1", { listInvoices, ...clock });
    expect(result.kind).toBe("paid");
  });

  it("rejects with an AbortError when the signal aborts", async () => {
    const controller = new AbortController();
    const listInvoices = async () => {
      controller.abort();
      return [];
    };
    const sleep = async (_ms: number, signal?: AbortSignal) => {
      if (signal?.aborted) {
        const error = new Error("Aborted");
        error.name = "AbortError";
        throw error;
      }
    };
    await expect(waitForPayment("txn_1", { listInvoices, sleep, signal: controller.signal })).rejects.toMatchObject({
      name: "AbortError",
    });
  });

  it("ignores a draft invoice for the same transaction", async () => {
    const clock = fakeClock();
    const listInvoices = async () => [invoice({ status: "draft" })];
    const result = await waitForPayment("txn_1", { listInvoices, ...clock });
    expect(result).toEqual({ kind: "pending" });
  });
});
