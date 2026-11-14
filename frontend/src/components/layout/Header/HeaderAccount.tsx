"use client";

import { ChevronDown, Coins, Images, LoaderCircle, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { NavLink } from "@/components/layout/constants";
import { api } from "@/lib/api/client";
import type { Me } from "@/lib/api/types";
import { onCreditsChanged } from "@/lib/balance";
import { isSupabaseEnabled } from "@/lib/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import styles from "./main.module.css";

type AccountUser = { id: string; email?: string };
type HeaderAccountProps = { links: readonly NavLink[]; signedInLinks: readonly NavLink[]; children?: ReactNode };

function isActiveLink(pathname: string, href: string) {
  const [url, section] = href.split("#");
  const path = url.split("?")[0];
  // All landing sections share a pathname; only Explore represents that page.
  if (section) return section === "top" && pathname === path;
  return pathname === path || (path !== "/" && pathname.startsWith(`${path}/`));
}

export function HeaderAccount({ links, signedInLinks, children }: HeaderAccountProps) {
  // Public actions are also the stable first-render state while auth initializes.
  const [user, setUser] = useState<AccountUser | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const navigationRef = useRef<HTMLElement>(null);
  const navigationListRef = useRef<HTMLUListElement>(null);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const creditsRequest = useRef<AbortController | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const userId = user?.id;

  useLayoutEffect(() => {
    const navigation = navigationRef.current;
    const list = navigationListRef.current;
    if (!navigation || !list) return;
    let disposed = false;
    const measure = () => {
      if (disposed) return;
      const active = list.querySelector<HTMLAnchorElement>('a[aria-current="page"]');
      const bounds = active?.getBoundingClientRect();
      list.style.setProperty("--nav-active-x", `${bounds ? bounds.left - list.getBoundingClientRect().left : 0}px`);
      list.style.setProperty("--nav-active-width", `${bounds?.width ?? 0}px`);
      list.style.setProperty("--nav-active-visible", active ? "1" : "0");
      navigation.dataset.enhanced = "true";
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    observer.observe(navigation);
    void document.fonts.ready.then(measure);
    return () => {
      disposed = true;
      observer.disconnect();
    };
  }, [pathname, userId]);

  const loadCredits = useCallback(async () => {
    creditsRequest.current?.abort();
    const controller = new AbortController();
    creditsRequest.current = controller;
    try {
      const me = await api.get<Me>("/v1/me", { signal: controller.signal });
      if (!controller.signal.aborted) setCredits(me.credits.available);
    } catch {
      if (!controller.signal.aborted) setCredits(null);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseEnabled()) return;
    try {
      const supabase = createSupabaseBrowserClient();
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session ? { id: session.user.id, email: session.user.email } : null);
        if (!session) setCredits(null);
      });
      return () => data.subscription.unsubscribe();
    } catch {
      // The public navigation remains usable if auth has not been configured.
      return;
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    // Fetching credits for the signed-in user sets loading state first; that is the point of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCredits();
    const unsubscribe = onCreditsChanged(() => void loadCredits());
    return () => {
      unsubscribe();
      creditsRequest.current?.abort();
    };
  }, [userId, loadCredits]);

  useEffect(() => {
    if (detailsRef.current) detailsRef.current.open = false;
  }, [pathname]);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      const details = detailsRef.current;
      if (details?.open && event.target instanceof Node && !details.contains(event.target)) details.open = false;
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  async function signOut() {
    if (signingOut || !isSupabaseEnabled()) return;
    setSigningOut(true);
    setSignOutError("");
    try {
      const { error } = await createSupabaseBrowserClient().auth.signOut();
      if (error) throw error;
      setUser(null);
      setCredits(null);
      // Refresh server auth checks on protected pages after clearing the session.
      router.refresh();
    } catch {
      setSignOutError("Couldn’t sign out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  const accountName = user?.email?.split("@")[0] || "Your account";
  const creditLabel = credits === null ? "Balance unavailable" : `${credits.toLocaleString()} credits`;
  const closeAccountMenu = () => {
    if (detailsRef.current) detailsRef.current.open = false;
  };

  return (
    <>
      <nav ref={navigationRef} className={styles.navigation} aria-label="Main navigation">
        <ul ref={navigationListRef}>
          {(user ? signedInLinks : links).map((link) => (
            <li key={link.href}>
              <Link href={link.href} aria-current={isActiveLink(pathname, link.href) ? "page" : undefined}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {children}
      <div className={styles.actions}>
        {user ? (
          <details
            ref={detailsRef}
            className={styles.account}
            onKeyDown={(event) => {
              if (event.key === "Escape" && detailsRef.current?.open) {
                event.preventDefault();
                detailsRef.current.open = false;
                detailsRef.current.querySelector("summary")?.focus();
              }
            }}
          >
            <summary aria-label={`Open account menu for ${accountName}`} className={styles.accountTrigger}>
              <span className={styles.avatar} aria-hidden="true">
                {accountName.charAt(0).toUpperCase()}
              </span>
              <ChevronDown className={styles.chevron} size={11} aria-hidden="true" />
            </summary>
            <div className={styles.menu}>
              <div className={styles.identity}>
                <strong>{accountName}</strong>
                <span>{user.email || "Signed in"}</span>
              </div>
              <Link href="/account" onClick={closeAccountMenu} className={styles.balance}>
                <Coins size={15} aria-hidden="true" />
                <span>{creditLabel}</span>
              </Link>
              <nav aria-label="Account navigation" className={styles.menuNavigation}>
                <Link href="/account" onClick={closeAccountMenu}>
                  <UserRound size={15} aria-hidden="true" />
                  Account
                </Link>
                <Link href="/creations" onClick={closeAccountMenu}>
                  <Images size={15} aria-hidden="true" />
                  My creations
                </Link>
              </nav>
              <button type="button" onClick={signOut} disabled={signingOut} className={styles.signOut}>
                {signingOut ? (
                  <LoaderCircle className={styles.spinner} size={15} aria-hidden="true" />
                ) : (
                  <LogOut size={15} aria-hidden="true" />
                )}
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
              {signOutError && (
                <p className={styles.error} role="alert">
                  {signOutError}
                </p>
              )}
            </div>
          </details>
        ) : (
          <>
            <Link href="/sign-in" className={styles.login}>
              Log in
            </Link>
            <Link href="/sign-up" className={styles.signup}>
              Sign up
            </Link>
          </>
        )}
      </div>
    </>
  );
}
