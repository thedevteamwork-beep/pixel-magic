"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import type { Me } from "@/lib/api/types";
import { onCreditsChanged } from "@/lib/balance";
import { isSupabaseEnabled } from "@/lib/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button, ButtonWithLink } from "@/ui/Button";

/** `undefined` while we don't know yet, `null` when signed out. */
type Email = string | null | undefined;

export function HeaderAccount() {
  const [email, setEmail] = useState<Email>(undefined);
  const [credits, setCredits] = useState<number | null>(null);
  const [signOutFailed, setSignOutFailed] = useState(false);
  const router = useRouter();

  const loadCredits = useCallback(async () => {
    try {
      const me = await api.get<Me>("/v1/me");
      setCredits(me.credits.available);
    } catch {
      setCredits(null);
    }
  }, []);

  useEffect(() => {
    // Supabase is off: `email` stays unknown, so the header shows no account.
    if (!isSupabaseEnabled()) return;
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
    const { error } = await createSupabaseBrowserClient().auth.signOut();
    setSignOutFailed(Boolean(error));
    // Re-run the proxy so a user on /generate is sent to /sign-in.
    if (!error) router.refresh();
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
      {signOutFailed && <span className="text-xs text-subtle">Sign-out failed — try again</span>}
      <Button variant="outline" size="sm" onClick={signOut}>
        Sign out
      </Button>
    </div>
  );
}
