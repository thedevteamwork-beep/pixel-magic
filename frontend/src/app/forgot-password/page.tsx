import type { Metadata } from "next";
import { AuthPage, type AuthSearchParams } from "@/components/auth/AuthPage";

export const metadata: Metadata = { title: "Reset your password — Pixel Magic", robots: { index: false, follow: false } };

export default function ForgotPasswordPage({ searchParams }: { searchParams: AuthSearchParams }) {
  return <AuthPage mode="forgot-password" searchParams={searchParams} />;
}
