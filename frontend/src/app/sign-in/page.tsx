import { Suspense } from "react";
import { SignInForm } from "@/app/sign-in/SignInForm";
import { isSupabaseEnabled } from "@/lib/env";
import { Container } from "@/ui/Container";

export const metadata = { title: "Sign in — Pixel Magic" };

export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  if (!isSupabaseEnabled()) {
    return (
      <Container className="flex justify-center py-16">
        <p className="text-sm text-subtle">Sign-in is turned off for now.</p>
      </Container>
    );
  }
  return (
    <Container className="flex justify-center py-16">
      <Suspense>
        <SignInFormFromQuery searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

// Reading the query is request-time data, so it sits inside <Suspense>.
async function SignInFormFromQuery({ searchParams }: Pick<PageProps<"/sign-in">, "searchParams">) {
  const { next, error } = await searchParams;
  return <SignInForm next={typeof next === "string" ? next : null} failed={error === "1"} />;
}
