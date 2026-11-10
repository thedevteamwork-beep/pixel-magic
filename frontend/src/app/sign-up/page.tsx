import type { Metadata } from "next";
import { AuthPage, type AuthSearchParams } from "@/components/auth/AuthPage";

export const metadata: Metadata = { title: "Sign up — Pixel Magic", description: "Make a little magic. Create your Pixel Magic account and find your next creative direction." };

export default function SignUpPage({ searchParams }: { searchParams: AuthSearchParams }) {
  return <AuthPage mode="sign-up" searchParams={searchParams} />;
}
