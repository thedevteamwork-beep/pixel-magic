"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Info,
  KeyRound,
  LoaderCircle,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createAuthActions } from "@/lib/auth/actions";
import { authErrorMessage, MIN_PASSWORD_LENGTH, validateAuthForm, type AuthFieldErrors } from "@/lib/auth/messages";
import { authPath, type AuthMode } from "@/lib/auth/paths";
import { safeNext } from "@/lib/auth/safeNext";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import styles from "./AuthForm.module.css";

const content = {
  "sign-in": {
    eyebrow: "Your creative space",
    title: "Welcome back.",
    description: "Good to see you. Let’s pick up where inspiration left off.",
    action: "Log in",
    busy: "Logging you in…",
  },
  "sign-up": {
    eyebrow: "It starts with you",
    title: "Make a little magic.",
    description: "One account. A whole world of creative possibilities.",
    action: "Create account",
    busy: "Creating your account…",
  },
  "forgot-password": {
    eyebrow: "A little help getting back",
    title: "A fresh start.",
    description: "Enter your email and we’ll send you a link to reset your password.",
    action: "Send reset link",
    busy: "Sending your link…",
  },
  "reset-password": {
    eyebrow: "Back to possibilities",
    title: "Make it yours again.",
    description: "Choose a new password for your creative space.",
    action: "Save new password",
    busy: "Saving your password…",
  },
} as const;

type AuthFormProps = { mode: AuthMode; next: string | null; failed: boolean; enabled: boolean };
type View = "form" | "confirmation" | "reset-sent" | "password-updated";
type Pending = "email" | "google" | "resend" | null;

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.89-1.74 2.98-4.3 2.98-7.36Z" />
      <path d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.06.97-3.38.97-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z" />
      <path d="M6.41 13.93A6 6 0 0 1 6.1 12c0-.67.12-1.32.31-1.93V7.48H3.07A10 10 0 0 0 2 12c0 1.61.39 3.14 1.07 4.52l3.34-2.59Z" />
      <path d="M12 5.95c1.47 0 2.78.5 3.82 1.49l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.48l3.34 2.59C7.2 7.71 9.4 5.95 12 5.95Z" />
    </svg>
  );
}

function PasswordField({
  name,
  label,
  value,
  onChange,
  error,
  newPassword = false,
  hint,
}: {
  name: "password" | "confirmPassword";
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  newPassword?: boolean;
  hint?: string;
}) {
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const describedBy =
    [error && `${name}-error`, hint && `${name}-hint`, capsLock && `${name}-caps`].filter(Boolean).join(" ") ||
    undefined;
  return (
    <div className={styles.field}>
      <label htmlFor={name}>{label}</label>
      <div className={`${styles.inputWrap} ${error ? styles.invalid : ""}`}>
        <KeyRound size={17} className={styles.fieldIcon} aria-hidden="true" />
        <input
          id={name}
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={newPassword ? "new-password" : "current-password"}
          required
          minLength={newPassword ? MIN_PASSWORD_LENGTH : undefined}
          placeholder={
            name === "confirmPassword"
              ? "Enter it once more"
              : newPassword
                ? "Create a password"
                : "Enter your password"
          }
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          onKeyUp={(event) => setCapsLock(event.getModifierState("CapsLock"))}
          onBlur={() => setCapsLock(false)}
        />
        <button
          type="button"
          className={styles.reveal}
          onClick={() => setVisible((current) => !current)}
          aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
          aria-pressed={visible}
        >
          {visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
        </button>
      </div>
      {hint && (
        <p className={styles.hint} id={`${name}-hint`}>
          <span className={value.length >= MIN_PASSWORD_LENGTH ? styles.requirementMet : ""}>
            {value.length >= MIN_PASSWORD_LENGTH && <Check size={12} aria-hidden="true" />}
            {hint}
          </span>
        </p>
      )}
      {capsLock && (
        <p className={styles.hint} id={`${name}-caps`}>
          Caps Lock is on.
        </p>
      )}
      {error && (
        <p className={styles.fieldError} id={`${name}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

export function AuthForm({ mode, next, failed, enabled }: AuthFormProps) {
  const router = useRouter();
  const target = safeNext(next);
  const copy = content[mode];
  const emailMode = mode === "sign-in" || mode === "sign-up";
  const formRef = useRef<HTMLFormElement>(null);
  const working = useRef(false);
  const noticeRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<AuthFieldErrors>({});
  const [message, setMessage] = useState<string | null>(
    failed
      ? mode === "forgot-password"
        ? "That reset link has expired or was already used. Request a new one below."
        : "That sign-in link couldn’t be completed. Please try again."
      : null,
  );
  const [canResendConfirmation, setCanResendConfirmation] = useState(false);
  const [pending, setPending] = useState<Pending>(null);
  const [view, setView] = useState<View>("form");
  const [recoveryReady, setRecoveryReady] = useState<boolean | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const cooldownActive = cooldown > 0;

  useEffect(() => {
    if (mode !== "reset-password" || !enabled) return;
    let active = true;
    try {
      void createSupabaseBrowserClient()
        .auth.getUser()
        .then(({ data, error }) => {
          if (active) setRecoveryReady(!error && Boolean(data.user));
        })
        .catch(() => {
          if (active) setRecoveryReady(false);
        });
    } catch {
      setRecoveryReady(false);
    }
    return () => {
      active = false;
    };
  }, [mode, enabled]);

  useEffect(() => {
    if (!cooldownActive) return;
    const timer = window.setInterval(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldownActive]);
  useEffect(() => {
    if (message) noticeRef.current?.focus();
  }, [message]);
  useEffect(() => {
    if (view !== "form") successRef.current?.focus();
  }, [view]);

  async function run(kind: Exclude<Pending, null>, task: () => Promise<void>) {
    if (working.current || !enabled) return;
    working.current = true;
    setPending(kind);
    setMessage(null);
    setCanResendConfirmation(false);
    try {
      await task();
    } catch (error) {
      setMessage(authErrorMessage(error));
      setCanResendConfirmation(
        typeof error === "object" && error !== null && "code" in error && error.code === "email_not_confirmed",
      );
    } finally {
      working.current = false;
      setPending(null);
    }
  }

  function actions() {
    return createAuthActions(createSupabaseBrowserClient().auth);
  }
  function destination() {
    return { origin: window.location.origin, next: target };
  }
  function enterWorkspace() {
    router.replace(target);
    router.refresh();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (working.current || (mode === "reset-password" && recoveryReady !== true)) return;
    const validation = validateAuthForm(mode, { email, password, confirmPassword });
    setErrors(validation);
    const firstError = Object.keys(validation)[0];
    if (firstError) {
      (formRef.current?.elements.namedItem(firstError) as HTMLInputElement | null)?.focus();
      return;
    }
    await run("email", async () => {
      const auth = actions();
      if (mode === "sign-in") {
        await auth.signIn({ email, password });
        enterWorkspace();
      } else if (mode === "sign-up") {
        const result = await auth.signUp({ email, password, ...destination() });
        setPassword("");
        if (result === "signed-in") enterWorkspace();
        else {
          setView("confirmation");
          setCooldown(60);
        }
      } else if (mode === "forgot-password") {
        await auth.requestReset({ email, ...destination() });
        setView("reset-sent");
        setCooldown(60);
      } else if (recoveryReady) {
        await auth.updatePassword(password);
        setPassword("");
        setConfirmPassword("");
        setView("password-updated");
      }
    });
  }

  async function resend() {
    if (cooldownActive) return;
    await run("resend", async () => {
      const auth = actions();
      if (view === "reset-sent") await auth.requestReset({ email, ...destination() });
      else {
        await auth.resendConfirmation({ email, ...destination() });
        setView("confirmation");
      }
      setCooldown(60);
    });
  }

  const notice = message && (
    <div ref={noticeRef} className={styles.errorNotice} role="alert" tabIndex={-1}>
      <Info size={16} aria-hidden="true" />
      <div>
        <p>{message}</p>
        {canResendConfirmation && (
          <button type="button" onClick={resend} disabled={Boolean(pending)}>
            Resend confirmation email
          </button>
        )}
      </div>
    </div>
  );

  if (view !== "form") {
    const updated = view === "password-updated";
    return (
      <div className={styles.success}>
        <span className={styles.successIcon}>
          {updated ? <CheckCircle2 size={29} aria-hidden="true" /> : <Mail size={29} aria-hidden="true" />}
        </span>
        <p className={styles.eyebrow}>{updated ? "Ready for what’s next" : "One small step"}</p>
        <h1 ref={successRef} tabIndex={-1}>
          {updated ? "You’re all set." : "Check your inbox."}
        </h1>
        {updated ? (
          <p>Your password is updated. Your next idea is waiting.</p>
        ) : (
          <>
            <p>
              {view === "reset-sent"
                ? "If there’s an account for this address, you’ll receive a password reset link."
                : "Follow the confirmation link in your email to finish creating your account."}
            </p>
            <strong className={styles.emailAddress}>{email.trim()}</strong>
            <p className={styles.deliveryNote}>
              Open the link in this browser. Nothing there? Take a quick look in spam.
            </p>
          </>
        )}
        {notice}
        {updated ? (
          <button type="button" className={styles.submit} onClick={enterWorkspace}>
            Continue creating <ArrowRight size={17} aria-hidden="true" />
          </button>
        ) : (
          <>
            <button
              type="button"
              className={styles.google}
              disabled={Boolean(pending) || cooldownActive}
              onClick={resend}
            >
              {pending === "resend" ? (
                <>
                  <LoaderCircle size={16} className={styles.spinner} aria-hidden="true" /> Sending…
                </>
              ) : cooldownActive ? (
                `Resend email in ${cooldown}s`
              ) : (
                "Resend email"
              )}
            </button>
            <button
              type="button"
              className={styles.quietButton}
              disabled={Boolean(pending)}
              onClick={() => {
                setView("form");
                setMessage(null);
                setCanResendConfirmation(false);
              }}
            >
              <ArrowLeft size={14} aria-hidden="true" /> Use a different email
            </button>
            <p className={styles.switch}>
              Ready to log in?{" "}
              <Link href={authPath("sign-in", target)}>
                Log in <ArrowRight size={13} aria-hidden="true" />
              </Link>
            </p>
          </>
        )}
      </div>
    );
  }

  const resetBlocked = mode === "reset-password" && enabled && recoveryReady !== true;
  const disabled = Boolean(pending) || !enabled || resetBlocked;
  return (
    <div className={styles.formContainer}>
      <div className={styles.intro}>
        <p className={styles.eyebrow}>
          <Sparkles size={13} aria-hidden="true" /> {copy.eyebrow}
        </p>
        <h1 id="auth-form-title">{copy.title}</h1>
        <p>{copy.description}</p>
      </div>
      {!enabled && (
        <div className={styles.infoNotice} role="status">
          <Info size={16} aria-hidden="true" />
          <p>Sign-in is temporarily unavailable. Please try again later.</p>
        </div>
      )}
      {notice}
      {mode === "reset-password" && enabled && recoveryReady === false ? (
        <div className={styles.expired}>
          <KeyRound size={26} aria-hidden="true" />
          <h2>Let’s get you a fresh link.</h2>
          <p>Open the link from your reset email in this browser, or request a new one to continue.</p>
          <Link className={styles.submit} href={authPath("forgot-password", target)}>
            Request a reset link <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <>
          {emailMode && (
            <>
              <button
                type="button"
                className={styles.google}
                disabled={disabled}
                onClick={() =>
                  void run("google", async () => {
                    const url = await actions().google(destination());
                    window.location.assign(url);
                  })
                }
              >
                {pending === "google" ? (
                  <LoaderCircle size={18} className={styles.spinner} aria-hidden="true" />
                ) : (
                  <GoogleMark />
                )}
                {pending === "google" ? "Connecting to Google…" : "Continue with Google"}
              </button>
              <div className={styles.divider}>
                <span>or continue with email</span>
              </div>
            </>
          )}
          <form
            ref={formRef}
            onSubmit={submit}
            noValidate
            aria-labelledby="auth-form-title"
            aria-busy={pending === "email"}
          >
            <fieldset disabled={disabled} className={styles.fields}>
              <legend className={styles.srOnly}>
                {mode === "reset-password" ? "Choose a new password" : "Your account details"}
              </legend>
              {mode !== "reset-password" && (
                <div className={styles.field}>
                  <label htmlFor="email">Email address</label>
                  <div className={`${styles.inputWrap} ${errors.email ? styles.invalid : ""}`}>
                    <Mail size={17} className={styles.fieldIcon} aria-hidden="true" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      autoCapitalize="none"
                      spellCheck={false}
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        setErrors((current) => ({ ...current, email: undefined }));
                        setMessage(null);
                        setCanResendConfirmation(false);
                      }}
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={errors.email ? "email-error" : undefined}
                    />
                  </div>
                  {errors.email && (
                    <p id="email-error" className={styles.fieldError}>
                      {errors.email}
                    </p>
                  )}
                </div>
              )}
              {mode !== "forgot-password" && (
                <PasswordField
                  name="password"
                  label={mode === "reset-password" ? "New password" : "Password"}
                  value={password}
                  onChange={(value) => {
                    setPassword(value);
                    setErrors((current) => ({ ...current, password: undefined }));
                    setMessage(null);
                    setCanResendConfirmation(false);
                  }}
                  error={errors.password}
                  newPassword={mode !== "sign-in"}
                  hint={mode !== "sign-in" ? "At least 8 characters. A passphrase works great." : undefined}
                />
              )}
              {mode === "reset-password" && (
                <PasswordField
                  name="confirmPassword"
                  label="Confirm password"
                  value={confirmPassword}
                  onChange={(value) => {
                    setConfirmPassword(value);
                    setErrors((current) => ({ ...current, confirmPassword: undefined }));
                  }}
                  error={errors.confirmPassword}
                  newPassword
                />
              )}
              {mode === "sign-in" && (
                <Link href={authPath("forgot-password", target)} className={styles.forgot}>
                  Forgot password?
                </Link>
              )}
              <button type="submit" className={styles.submit}>
                {pending === "email" || resetBlocked ? (
                  <LoaderCircle size={17} className={styles.spinner} aria-hidden="true" />
                ) : null}
                {resetBlocked ? "Checking your reset link…" : pending === "email" ? copy.busy : copy.action}
                {!pending && !resetBlocked && <ArrowRight size={17} aria-hidden="true" />}
              </button>
            </fieldset>
          </form>
          {emailMode && (
            <p className={styles.reassurance}>
              <ShieldCheck size={13} aria-hidden="true" /> A space for your ideas. An account that’s yours.
            </p>
          )}
        </>
      )}
      <p className={styles.switch}>
        {mode === "sign-in" ? (
          <>
            New to Pixel Magic?{" "}
            <Link href={authPath("sign-up", target)}>
              Create an account <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </>
        ) : mode === "sign-up" ? (
          <>
            Already part of the magic?{" "}
            <Link href={authPath("sign-in", target)}>
              Log in <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </>
        ) : (
          <Link href={authPath("sign-in", target)}>
            <ArrowLeft size={13} aria-hidden="true" /> Back to log in
          </Link>
        )}
      </p>
    </div>
  );
}

export function AuthFormSkeleton({ mode }: { mode: AuthMode }) {
  return (
    <div className={styles.skeleton} aria-busy="true" aria-label="Loading account form">
      <p className={styles.eyebrow}>{content[mode].eyebrow}</p>
      <h1>{content[mode].title}</h1>
      <p>{content[mode].description}</p>
      <div />
      <div />
      <div />
      <span className={styles.srOnly}>Loading form…</span>
    </div>
  );
}
