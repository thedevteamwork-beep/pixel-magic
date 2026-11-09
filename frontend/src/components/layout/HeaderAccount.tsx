"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import type { Me } from "@/lib/api/types";
import { onCreditsChanged } from "@/lib/balance";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button, ButtonWithLink } from "@/ui/Button";

type NavLinks = { label: string; href: string }[];

/** `undefined` while we don't know yet, `null` when signed out. */
type Email = string | null | undefined;

export function HeaderAccount({ links, signedInLinks }: { links: NavLinks; signedInLinks: NavLinks }) {
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

  // Until we know, show the public links so the header doesn't jump.
  const nav = (
    <nav aria-label="Main">
      <ul className="flex items-center gap-5 text-sm">
        {(email ? signedInLinks : links).map((link) => (
          <li key={link.label}>
            <Link href={link.href} className="text-subtle transition-colors hover:text-foreground">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );

  if (email === undefined) {
    return (
      <>
        {nav}
        <div className="ml-auto" />
      </>
    );
  }

  if (email === null) {
    return (
      <>
        {nav}
        <ButtonWithLink href="/sign-in" size="sm" className="ml-auto">
          Get started
        </ButtonWithLink>
      </>
    );
  }

  return (
    <>
      {nav}
      <div className="ml-auto flex items-center gap-4 text-sm">
        <Link href="/account" className="text-subtle transition-colors hover:text-foreground">
          {email}
        </Link>
        <Link href="/account" className="font-medium">
          {credits === null ? "—" : credits} credits
        </Link>
        {signOutFailed && <span className="text-xs text-subtle">Sign-out failed — try again</span>}
        <Button variant="outline" size="sm" onClick={signOut}>
          Sign out
        </Button>
      </div>
    </>
  );
}
