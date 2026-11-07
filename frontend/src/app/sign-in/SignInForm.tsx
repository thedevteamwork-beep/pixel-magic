"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { safeNext } from "@/lib/auth/safeNext";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/ui/Button";
import { cn } from "@/lib/cn";

type Mode = "sign-in" | "sign-up";

const inputClasses =
  "h-10 w-full rounded-lg border border-border-strong bg-transparent px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-primary";

function callbackUrl(next: string) {
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
}

export function SignInForm({ next, failed }: { next: string | null; failed: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(failed ? "Sign-in failed — please try again" : null);
  const [busy, setBusy] = useState(false);
  const target = safeNext(next);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const supabase = createSupabaseBrowserClient();

    if (mode === "sign-in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(error.message);
        setBusy(false);
        return;
      }
      router.push(target);
      router.refresh();
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: callbackUrl(target) },
    });
    setMessage(error ? error.message : "Check your email to confirm your account");
    setBusy(false);
  }

  async function continueWithGoogle() {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl(target) },
    });
    if (error) setMessage(error.message);
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 flex gap-1 rounded-lg border border-border p-1" role="tablist">
        <ModeTab current={mode} value="sign-in" onSelect={setMode}>
          Sign in
        </ModeTab>
        <ModeTab current={mode} value="sign-up" onSelect={setMode}>
          Create account
        </ModeTab>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="Email"
          aria-label="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClasses}
        />
        <input
          type="password"
          required
          minLength={6}
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          placeholder="Password"
          aria-label="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClasses}
        />
        <Button type="submit" fullWidth disabled={busy}>
          Continue
        </Button>
      </form>

      <Button variant="outline" fullWidth className="mt-3" onClick={continueWithGoogle}>
        Continue with Google
      </Button>

      {message && (
        <p role="status" className="mt-4 text-sm text-subtle">
          {message}
        </p>
      )}
    </div>
  );
}

type ModeTabProps = {
  current: Mode;
  value: Mode;
  onSelect: (mode: Mode) => void;
  children: string;
};

function ModeTab({ current, value, onSelect, children }: ModeTabProps) {
  const selected = current === value;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={() => onSelect(value)}
      className={cn(
        "h-8 flex-1 rounded-md text-sm font-medium transition-colors",
        selected ? "bg-overlay-hover text-foreground" : "text-subtle hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
