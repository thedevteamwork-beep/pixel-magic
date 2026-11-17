"use client";

import { useEffect, useState } from "react";
import { isSupabaseEnabled } from "@/lib/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Whether someone is signed in: `null` until the session is known. With
 * Supabase off there is no sign-in, so requests go out as they are.
 */
export function useSignedIn(): boolean | null {
  const [signedIn, setSignedIn] = useState<boolean | null>(() => (isSupabaseEnabled() ? null : true));

  useEffect(() => {
    if (!isSupabaseEnabled()) return;
    const { data } = createSupabaseBrowserClient().auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return signedIn;
}
