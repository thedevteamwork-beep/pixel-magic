import { Suspense } from "react";
import { CreationsView } from "@/app/creations/CreationsView";
import { isSupabaseEnabled } from "@/lib/env";
import { Container } from "@/ui/Container";

export const metadata = { title: "My creations — Pixel Magic" };

export default function CreationsPage() {
  if (!isSupabaseEnabled()) {
    return (
      <Container className="flex justify-center py-16">
        <p className="text-sm text-subtle">Sign-in is turned off for now.</p>
      </Container>
    );
  }
  return (
    <Container className="py-10">
      <h1 className="font-display text-3xl font-bold uppercase tracking-tight md:text-4xl">My creations</h1>
      <p className="mt-2 text-sm text-subtle">Everything you have made, newest first.</p>
      <div className="mt-8">
        <Suspense>
          <CreationsView />
        </Suspense>
      </div>
    </Container>
  );
}
