import { Suspense } from "react";
import { AccountView } from "@/app/account/AccountView";
import { isSupabaseEnabled } from "@/lib/env";
import { Container } from "@/ui/Container";

export const metadata = { title: "Account — Pixel Magic" };

export default function AccountPage() {
  if (!isSupabaseEnabled()) {
    return (
      <Container className="flex justify-center py-16">
        <p className="text-sm text-subtle">Sign-in is turned off for now.</p>
      </Container>
    );
  }
  return (
    <Container className="py-10">
      <h1 className="font-display text-3xl font-bold uppercase tracking-tight md:text-4xl">Account</h1>
      <p className="mt-2 text-sm text-subtle">Your plan, credits and payments.</p>
      <div className="mt-8">
        <Suspense>
          <AccountView />
        </Suspense>
      </div>
    </Container>
  );
}
