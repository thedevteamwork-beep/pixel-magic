import type { CheckoutResult, PlanChangeResult } from "@/lib/api/billingTypes";

export type PurchaseStep = { kind: "checkout"; path: string } | { kind: "done"; message: string };

const TRANSACTION_ID = /^txn_[a-z0-9]{1,64}$/;

export function checkoutPath(transactionId: string): string {
  return `/checkout?_ptxn=${transactionId}`;
}

export function finishPath(transactionId: string): string {
  return `/checkout/finish?txn=${transactionId}`;
}

export function parseTransactionId(value: string | null | undefined): string | null {
  if (!value) return null;
  return TRANSACTION_ID.test(value) ? value : null;
}

export function nextStep(result: PlanChangeResult | CheckoutResult): PurchaseStep {
  switch (result.action) {
    case "checkout":
      return { kind: "checkout", path: checkoutPath(result.transactionId) };
    case "scheduled": {
      const date = new Date(result.effectiveAt).toLocaleDateString("en-US", {
        dateStyle: "medium",
      });
      return { kind: "done", message: `Your plan changes on ${date}.` };
    }
    case "reverted":
      return { kind: "done", message: "Your scheduled change was undone." };
    case "canceled":
      return { kind: "done", message: "Your plan was canceled." };
  }
}

/** While a call is in flight, further calls resolve undefined without calling fn. */
export function runOnce<A extends unknown[], R>(fn: (...a: A) => Promise<R>): (...a: A) => Promise<R | undefined> {
  let running = false;
  return async (...args: A) => {
    if (running) return undefined;
    running = true;
    try {
      return await fn(...args);
    } finally {
      running = false;
    }
  };
}
