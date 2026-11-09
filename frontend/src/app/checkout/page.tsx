import { Suspense } from "react";
import { PaddleCheckout } from "@/app/checkout/PaddleCheckout";
import { Container } from "@/ui/Container";

export const metadata = { title: "Checkout — Pixel Magic" };

export default function CheckoutPage() {
  return (
    <Container className="max-w-xl py-10">
      <h1 className="font-display text-3xl font-bold uppercase tracking-tight">Checkout</h1>
      <div className="mt-8">
        <Suspense>
          <PaddleCheckout />
        </Suspense>
      </div>
    </Container>
  );
}
