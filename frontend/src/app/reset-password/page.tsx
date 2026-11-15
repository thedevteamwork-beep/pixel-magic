import type { Metadata } from "next";
import { AuthPage, type AuthSearchParams } from "@/components/auth/AuthPage";

export const metadata: Metadata = {
  title: "Choose a new password — Pixel Magic",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage({ searchParams }: { searchParams: AuthSearchParams }) {
  return <AuthPage mode="reset-password" searchParams={searchParams} />;
}
