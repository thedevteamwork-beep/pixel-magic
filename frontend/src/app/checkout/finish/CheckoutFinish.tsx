"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { InvalidLink } from "@/app/checkout/InvalidLink";
import { api } from "@/lib/api/client";
import type { Invoice } from "@/lib/api/billingTypes";
import { notifyCreditsChanged } from "@/lib/balance";
import { parseTransactionId } from "@/lib/billing/purchase";
import { waitForPayment, type PaymentResult } from "@/lib/billing/waitForPayment";
import { Button, ButtonWithLink } from "@/ui/Button";

export function CheckoutFinish() {
  const transactionId = parseTransactionId(useSearchParams().get("txn"));
  if (!transactionId) return <InvalidLink />;
  return <PaymentStatus transactionId={transactionId} />;
}

function PaymentStatus({ transactionId }: { transactionId: string }) {
  const [result, setResult] = useState<PaymentResult | null>(null);
  /** Bumped by "Check again" to restart the wait. */
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    waitForPayment(transactionId, {
      listInvoices: () => api.get<Invoice[]>("/v1/billing/invoices"),
      signal: controller.signal,
    }).then(
      (outcome) => {
        if (controller.signal.aborted) return;
        setResult(outcome);
        if (outcome.kind === "paid") notifyCreditsChanged();
      },
      () => {},
    );
    return () => controller.abort();
  }, [transactionId, attempt]);

  if (!result) return <p className="text-center text-subtle">Confirming your payment…</p>;

  if (result.kind === "paid") {
    const item = result.invoice.item;
    return (
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight">Payment received.</h1>
        <p className="mt-3 text-subtle">{item ? `${item} is now active.` : "Your credits were added."}</p>
        <div className="mt-6 flex justify-center gap-3">
          <ButtonWithLink href="/generate">Start creating</ButtonWithLink>
          <ButtonWithLink href="/account" variant="outline">
            View account
          </ButtonWithLink>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center">
      <p>
        Your payment is still being confirmed. Credits appear within a few minutes; check your account page.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <ButtonWithLink href="/account">View account</ButtonWithLink>
        <Button variant="outline" onClick={() => {
            setResult(null);
            setAttempt((n) => n + 1);
          }}>
          Check again
        </Button>
      </div>
    </div>
  );
}
