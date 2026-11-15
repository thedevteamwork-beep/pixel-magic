import { Suspense } from "react";
import { isSupabaseEnabled } from "@/lib/env";
import type { AuthMode } from "@/lib/auth/paths";
import { AuthForm, AuthFormSkeleton } from "./AuthForm";
import { AuthShell } from "./AuthShell";

export type AuthSearchParams = Promise<Record<string, string | string[] | undefined>>;

export function AuthPage({ mode, searchParams }: { mode: AuthMode; searchParams: AuthSearchParams }) {
  return (
    <AuthShell mode={mode}>
      <Suspense fallback={<AuthFormSkeleton mode={mode} />}>
        <FormFromQuery mode={mode} searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function FormFromQuery({ mode, searchParams }: { mode: AuthMode; searchParams: AuthSearchParams }) {
  const { next, error } = await searchParams;
  return (
    <AuthForm
      key={mode}
      mode={mode}
      next={typeof next === "string" ? next : null}
      failed={error === "1"}
      enabled={isSupabaseEnabled()}
    />
  );
}
