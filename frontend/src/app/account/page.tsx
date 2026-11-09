import { Suspense } from "react";
import { AccountView } from "@/app/account/AccountView";
import { Container } from "@/ui/Container";

export const metadata = { title: "Account — Pixel Magic" };

export default function AccountPage() {
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
