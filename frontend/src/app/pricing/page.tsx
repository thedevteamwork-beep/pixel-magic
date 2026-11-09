import { Suspense } from "react";
import { PricingView } from "@/app/pricing/PricingView";
import { Container } from "@/ui/Container";

export const metadata = { title: "Pricing — Pixel Magic" };

export default function PricingPage() {
  return (
    <Container className="py-10">
      <h1 className="font-display text-3xl font-bold uppercase tracking-tight md:text-4xl">Pricing</h1>
      <p className="mt-2 text-sm text-subtle">Pick a plan, or top up with an add-on any time.</p>
      <div className="mt-8">
        <Suspense>
          <PricingView />
        </Suspense>
      </div>
    </Container>
  );
}
