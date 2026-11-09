import { Suspense } from "react";
import { CheckoutFinish } from "@/app/checkout/finish/CheckoutFinish";
import { Container } from "@/ui/Container";

export const metadata = { title: "Payment — Pixel Magic" };

export default function CheckoutFinishPage() {
  return (
    <Container className="max-w-xl py-10">
      <div className="mt-8">
        <Suspense>
          <CheckoutFinish />
        </Suspense>
      </div>
    </Container>
  );
}
