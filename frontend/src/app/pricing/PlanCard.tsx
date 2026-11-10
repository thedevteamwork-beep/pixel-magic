"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ConfirmChange } from "@/app/pricing/ConfirmChange";
import { api } from "@/lib/api/client";
import type { Account, Plan, PlanChangePreview, PlanChangeResult } from "@/lib/api/billingTypes";
import { billingErrorMessage } from "@/lib/billing/messages";
import { formatMoney } from "@/lib/billing/money";
import { nextStep, runOnce } from "@/lib/billing/purchase";
import { Badge } from "@/ui/Badge";
import { Button, ButtonWithLink } from "@/ui/Button";

type PlanCardProps = {
  plan: Plan;
  /** Every plan we know, to name the plan a change is scheduled for. */
  plans: Plan[];
  /** `null` when signed out or when the account hasn't loaded. */
  account: Account | null;
  signedIn: boolean;
  /** Called after a change that needs no checkout. */
  onDone: (message: string) => void;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { dateStyle: "medium" });
}

export function PlanCard({ plan, plans, account, signedIn, onDone }: PlanCardProps) {
  const router = useRouter();
  const [preview, setPreview] = useState<PlanChangePreview | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscription = account?.subscription ?? null;
  const isCurrent = subscription?.plan === plan.name;
  const nextPlan = isCurrent && subscription?.nextPlan ? plans.find((p) => p.name === subscription.nextPlan) : null;
  const unit = plan.interval === "yearly" ? "year" : "month";

  // One guard per card, so a double click sends one request.
  const loadPreview = useMemo(
    () =>
      runOnce(async () => {
        setPending(true);
        setError(null);
        try {
          setPreview(
            await api.get<PlanChangePreview>(
              `/v1/billing/subscription/preview?plan=${encodeURIComponent(plan.name)}`,
            ),
          );
        } catch (e) {
          setError(billingErrorMessage(e));
        } finally {
          setPending(false);
        }
      }),
    [plan.name],
  );

  const confirm = useMemo(
    () =>
      runOnce(async () => {
        setPending(true);
        setError(null);
        try {
          const result = await api.post<PlanChangeResult>("/v1/billing/subscription", { plan: plan.name });
          const step = nextStep(result);
          if (step.kind === "checkout") {
            router.push(step.path);
            return;
          }
          setPreview(null);
          onDone(step.message);
        } catch (e) {
          setError(billingErrorMessage(e));
        } finally {
          setPending(false);
        }
      }),
    [plan.name, router, onDone],
  );

  return (
    <li className="flex flex-col rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">{plan.display}</h3>
        {isCurrent && <Badge>Current</Badge>}
      </div>
      <p className="mt-1 text-sm text-subtle">{plan.description}</p>
      <p className="mt-4">
        <span className="text-3xl font-bold">{formatMoney(plan.amount, plan.currency)}</span>{" "}
        <span className="text-sm text-subtle">/ {unit}</span>
      </p>
      <ul className="mt-4 flex-1 space-y-1 text-sm text-muted">
        <li>
          {plan.credits} credits each {unit}
        </li>
        {plan.creditValidityDays !== null && <li>Credits last {plan.creditValidityDays} days</li>}
      </ul>

      <div className="mt-6">
        {!signedIn ? (
          <ButtonWithLink href="/sign-in?next=%2Fpricing" fullWidth>
            Get started
          </ButtonWithLink>
        ) : isCurrent ? (
          <>
            <Button fullWidth disabled>
              Current plan
            </Button>
            {subscription?.nextPlan && (
              <p className="mt-3 text-xs text-subtle">
                Changes to {nextPlan?.display ?? subscription.nextPlan} on {formatDate(subscription.currentPeriodEnd)}.{" "}
                <a href="/account" className="underline hover:text-foreground">
                  Manage
                </a>
              </p>
            )}
          </>
        ) : (
          !preview && (
            <Button fullWidth variant="outline" onClick={() => void loadPreview()} disabled={pending}>
              Switch to {plan.display}
            </Button>
          )
        )}
        {!preview && error && <p role="alert" className="mt-3 text-xs text-subtle">{error}</p>}
      </div>

      {preview && (
        <ConfirmChange
          preview={preview}
          pending={pending}
          error={error}
          onConfirm={() => void confirm()}
          onBack={() => {
            setPreview(null);
            setError(null);
          }}
        />
      )}
    </li>
  );
}
