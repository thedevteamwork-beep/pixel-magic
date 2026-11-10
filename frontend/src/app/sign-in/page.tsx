import type { Metadata } from "next";
import { AuthPage, type AuthSearchParams } from "@/components/auth/AuthPage";

export const metadata: Metadata = { title: "Log in — Pixel Magic", description: "Welcome back to your creative space. Log in to Pixel Magic and pick up where inspiration left off." };

export default function SignInPage({ searchParams }: { searchParams: AuthSearchParams }) {
  return <AuthPage mode="sign-in" searchParams={searchParams} />;
}
