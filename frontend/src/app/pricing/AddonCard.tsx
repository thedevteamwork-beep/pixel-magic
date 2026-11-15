"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { api } from "@/lib/api/client";
import type { Addon, CheckoutResult } from "@/lib/api/billingTypes";
import { billingErrorMessage } from "@/lib/billing/messages";
import { formatMoney } from "@/lib/billing/money";
import { nextStep, runOnce } from "@/lib/billing/purchase";
import { Button, ButtonWithLink } from "@/ui/Button";

type AddonCardProps = {
  addon: Addon;
  signedIn: boolean;
};

export function AddonCard({ addon, signedIn }: AddonCardProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buy = useMemo(
    () =>
      runOnce(async () => {
        setPending(true);
        setError(null);
        try {
          const result = await api.post<CheckoutResult>("/v1/billing/addons", { addon: addon.name });
          const step = nextStep(result);
          if (step.kind === "checkout") router.push(step.path);
        } catch (e) {
          setError(billingErrorMessage(e));
        } finally {
          setPending(false);
        }
      }),
    [addon.name, router],
  );

  return (
    <li className="flex flex-col rounded-2xl border border-border bg-surface p-6">
      <h3 className="text-lg font-semibold">{addon.display}</h3>
      <p className="mt-1 text-sm text-subtle">{addon.description}</p>
      <p className="mt-4 text-2xl font-bold">{formatMoney(addon.amount, addon.currency)}</p>
      <p className="mt-2 flex-1 text-sm text-muted">
        {addon.credits} credits, valid {addon.durationDays} days
      </p>
      <div className="mt-6">
        {signedIn ? (
          <Button fullWidth variant="outline" onClick={() => void buy()} disabled={pending}>
            Buy
          </Button>
        ) : (
          <ButtonWithLink href="/sign-in?next=%2Fpricing" variant="outline" fullWidth>
            Sign in to buy
          </ButtonWithLink>
        )}
        {error && (
          <p role="alert" className="mt-3 text-xs text-subtle">
            {error}
          </p>
        )}
      </div>
    </li>
  );
}
