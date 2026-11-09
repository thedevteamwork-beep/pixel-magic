import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { LandingProvider } from "@/components/landing/LandingProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pixel Magic",
  description: "Discover cinematic videos, expressive images, and campaign inspiration. A little idea. A whole world of possibility. Pixel Magic.",
  openGraph: {
    title: "Pixel Magic — Make something worth stopping for",
    description: "Explore image, video, and marketing template collections for your next creative direction.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <LandingProvider>
          <a className="skip-link" href="#main-content">Skip to content</a>
          <Header />
          {children}
          <Footer />
        </LandingProvider>
      </body>
    </html>
  );
}
