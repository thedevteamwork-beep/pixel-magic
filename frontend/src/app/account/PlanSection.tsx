"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/api/client";
import type { Subscription } from "@/lib/api/billingTypes";
import { notifyCreditsChanged } from "@/lib/balance";
import { billingErrorMessage } from "@/lib/billing/messages";
import { runOnce } from "@/lib/billing/purchase";
import { Button, ButtonWithLink } from "@/ui/Button";
import { SectionHeading } from "@/ui/SectionHeading";

type PlanSectionProps = {
  subscription: Subscription;
  planNames: Record<string, string>;
  onChanged: (subscription: Subscription) => void;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { dateStyle: "medium" });
}

export function PlanSection({ subscription, planNames, onChanged }: PlanSectionProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const undo = useMemo(
    () =>
      runOnce(async () => {
        setPending(true);
        setError(null);
        try {
          const result = await api.delete<{ subscription: Subscription }>("/v1/billing/subscription/scheduled-change");
          onChanged(result.subscription);
          notifyCreditsChanged();
        } catch (e) {
          setError(billingErrorMessage(e));
        } finally {
          setPending(false);
        }
      }),
    [onChanged],
  );

  const isFree = subscription.plan === "free";
  const date = formatDate(subscription.currentPeriodEnd);
  const next = subscription.nextPlan;

  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <SectionHeading title="Plan" tone="default" />
      <p className="mt-4 text-lg font-semibold">
        {subscription.display}
        {!isFree && (
          <span className="ml-2 text-sm font-normal text-subtle">
            {subscription.interval === "yearly" ? "Yearly" : "Monthly"}
          </span>
        )}
      </p>
      <p className="mt-1 text-sm text-muted">{isFree ? `Credits refresh on ${date}` : `Renews on ${date}`}</p>

      {next && (
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <p>{next === "free" ? `Your plan ends on ${date}.` : `Changes to ${planNames[next] ?? next} on ${date}.`}</p>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => void undo()}>
            Undo
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-muted">
          {error}
        </p>
      )}

      {subscription.paddleStatus === "past_due" && (
        <p role="status" className="mt-4 rounded-lg border border-border bg-surface-raised px-4 py-3 text-sm">
          Your last payment failed. Paddle will retry; update your card from the link in Paddle&apos;s email.
        </p>
      )}

      <ButtonWithLink className="mt-6" size="sm" variant="outline" href="/pricing">
        Change plan
      </ButtonWithLink>
    </section>
  );
}
