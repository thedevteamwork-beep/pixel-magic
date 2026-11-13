"use client";

import { useCallback, useEffect, useState } from "react";
import { AddonCard } from "@/app/pricing/AddonCard";
import { PlanCard } from "@/app/pricing/PlanCard";
import { api } from "@/lib/api/client";
import type { Account, Addon, Plan } from "@/lib/api/billingTypes";
import { notifyCreditsChanged } from "@/lib/balance";
import { isSupabaseEnabled } from "@/lib/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/ui/Button";
import { cn } from "@/lib/cn";
import { SectionHeading } from "@/ui/SectionHeading";

type Interval = Plan["interval"];

type Catalog = { plans: Plan[]; addons: Addon[] };

export function PricingView() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  /** `undefined` while we don't know yet. With Supabase off nobody can sign in, so it starts `false`. */
  const [signedIn, setSignedIn] = useState<boolean | undefined>(() => (isSupabaseEnabled() ? undefined : false));
  const [account, setAccount] = useState<Account | null>(null);
  const [interval, setInterval] = useState<Interval>("monthly");
  const [message, setMessage] = useState<string | null>(null);

  /** Bumped by "Try again" to re-run the load effect. */
  const [attempt, setAttempt] = useState(0);

  const loadAccount = useCallback(async () => {
    try {
      setAccount(await api.get<Account>("/v1/me"));
    } catch {
      setAccount(null);
    }
  }, []);

  useEffect(() => {
    let current = true;
    Promise.all([api.get<Plan[]>("/v1/plans"), api.get<Addon[]>("/v1/addons")]).then(
      ([plans, addons]) => current && setCatalog({ plans, addons }),
      () => current && setLoadFailed(true),
    );
    return () => {
      current = false;
    };
  }, [attempt]);

  useEffect(() => {
    // Supabase is off: stay signed out and make no /v1/me call.
    if (!isSupabaseEnabled()) return;
    const { data } = createSupabaseBrowserClient().auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
      if (session) void loadAccount();
      else setAccount(null);
    });
    return () => data.subscription.unsubscribe();
  }, [loadAccount]);

  const onDone = useCallback(
    (done: string) => {
      setMessage(done);
      void loadAccount();
      notifyCreditsChanged();
    },
    [loadAccount],
  );

  if (loadFailed) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 text-sm">
        <p>Couldn&apos;t load prices.</p>
        <Button
          className="mt-4"
          size="sm"
          variant="outline"
          onClick={() => {
            setLoadFailed(false);
            setAttempt((n) => n + 1);
          }}
        >
          Try again
        </Button>
      </div>
    );
  }
  if (!catalog) return <p className="text-sm text-subtle">Loading prices…</p>;

  const hasYearly = catalog.plans.some((p) => p.interval === "yearly");
  const shown = catalog.plans
    .filter((p) => Number(p.amount) === 0 || p.interval === (hasYearly ? interval : "monthly"))
    .sort((a, b) => a.priority - b.priority || Number(a.amount) - Number(b.amount));

  return (
    <div className="space-y-12">
      {message && (
        <p role="status" className="rounded-lg border border-border bg-surface px-4 py-3 text-sm">
          {message}
        </p>
      )}

      <section>
        <SectionHeading
          title="Plans"
          tone="default"
          actions={
            hasYearly && (
              <div role="group" aria-label="Billing interval" className="flex rounded-lg border border-border p-0.5">
                {(["monthly", "yearly"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={interval === value}
                    onClick={() => setInterval(value)}
                    className={cn(
                      "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                      interval === value ? "bg-surface-raised text-foreground" : "text-subtle hover:text-foreground",
                    )}
                  >
                    {value === "monthly" ? "Monthly" : "Yearly"}
                  </button>
                ))}
              </div>
            )
          }
        />
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((plan) => (
            <PlanCard
              key={plan.name}
              plan={plan}
              plans={catalog.plans}
              account={account}
              signedIn={Boolean(signedIn)}
              onDone={onDone}
            />
          ))}
        </ul>
      </section>

      {catalog.addons.length > 0 && (
        <section>
          <SectionHeading title="Add-ons" tone="default" description="One-off credits on top of your plan." />
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {catalog.addons.map((addon) => (
              <AddonCard key={addon.name} addon={addon} signedIn={Boolean(signedIn)} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
