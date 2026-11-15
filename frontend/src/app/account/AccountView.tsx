"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditsSection } from "@/app/account/CreditsSection";
import { InvoicesSection } from "@/app/account/InvoicesSection";
import { PlanSection } from "@/app/account/PlanSection";
import { api } from "@/lib/api/client";
import type { Account, Invoice, Plan, Subscription } from "@/lib/api/billingTypes";
import { billingErrorMessage } from "@/lib/billing/messages";
import { Button } from "@/ui/Button";

type Loaded = {
  account: Account;
  invoices: Invoice[];
  /** Plan name to display name, for showing a scheduled change. */
  planNames: Record<string, string>;
};

export function AccountView() {
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Bumped by "Try again" to re-run the load effect. */
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    Promise.all([
      api.get<Account>("/v1/me"),
      api.get<Invoice[]>("/v1/billing/invoices"),
      // Only used for friendly names; the page still works without it.
      api.get<Plan[]>("/v1/plans").catch(() => [] as Plan[]),
    ]).then(
      ([account, invoices, plans]) => {
        if (!current) return;
        setData({
          account,
          invoices,
          planNames: Object.fromEntries(plans.map((plan) => [plan.name, plan.display])),
        });
      },
      (e) => current && setError(billingErrorMessage(e)),
    );
    return () => {
      current = false;
    };
  }, [attempt]);

  const onSubscriptionChanged = useCallback((subscription: Subscription) => {
    setData((previous) => previous && { ...previous, account: { ...previous.account, subscription } });
  }, []);

  if (error) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 text-sm">
        <p>{error}</p>
        <Button
          className="mt-4"
          size="sm"
          variant="outline"
          onClick={() => {
            setError(null);
            setAttempt((n) => n + 1);
          }}
        >
          Try again
        </Button>
      </div>
    );
  }
  if (!data) return <p className="text-sm text-subtle">Loading your account…</p>;

  return (
    <div className="space-y-8">
      <PlanSection
        subscription={data.account.subscription}
        planNames={data.planNames}
        onChanged={onSubscriptionChanged}
      />
      <CreditsSection credits={data.account.credits} />
      <InvoicesSection invoices={data.invoices} />
    </div>
  );
}
