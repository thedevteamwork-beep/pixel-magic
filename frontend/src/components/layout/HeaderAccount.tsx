"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import type { Me } from "@/lib/api/types";
import { onCreditsChanged } from "@/lib/balance";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button, ButtonWithLink } from "@/ui/Button";

/** `undefined` while we don't know yet, `null` when signed out. */
type Email = string | null | undefined;

export function HeaderAccount() {
  const [email, setEmail] = useState<Email>(undefined);
  const [credits, setCredits] = useState<number | null>(null);

  const loadCredits = useCallback(async () => {
    try {
      const me = await api.get<Me>("/v1/me");
      setCredits(me.credits.available);
    } catch {
      setCredits(null);
    }
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
      if (session) void loadCredits();
      else setCredits(null);
    });
    return () => data.subscription.unsubscribe();
  }, [loadCredits]);

  useEffect(() => (email ? onCreditsChanged(() => void loadCredits()) : undefined), [email, loadCredits]);

  async function signOut() {
    await createSupabaseBrowserClient().auth.signOut();
  }

  if (email === undefined) return <div className="ml-auto" />;

  if (email === null) {
    return (
      <ButtonWithLink href="/sign-in" size="sm" className="ml-auto">
        Get started
      </ButtonWithLink>
    );
  }

  return (
    <div className="ml-auto flex items-center gap-4 text-sm">
      <span className="text-subtle">{email}</span>
      <span className="font-medium">{credits === null ? "—" : credits} credits</span>
      <Button variant="outline" size="sm" onClick={signOut}>
        Sign out
      </Button>
    </div>
  );
}
