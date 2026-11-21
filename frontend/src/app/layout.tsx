import type { Metadata } from "next";
import { Instrument_Serif, Inter, Space_Grotesk } from "next/font/google";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { LandingProvider } from "@/components/landing/LandingProvider";
import { SiteChrome } from "@/components/layout/SiteChrome";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

/** The serif for accent words in headings (`--font-editorial`). It only comes in one weight. */
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pixel Magic",
  description:
    "Discover cinematic videos, expressive images, and campaign inspiration. A little idea. A whole world of possibility. Pixel Magic.",
  openGraph: {
    title: "Pixel Magic — Make something worth stopping for",
    description: "Explore image, video, and marketing template collections for your next creative direction.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <LandingProvider>
          <a className="skip-link" href="#main-content">
            Skip to content
          </a>
          <SiteChrome header={<Header />} footer={<Footer />}>
            {children}
          </SiteChrome>
        </LandingProvider>
      </body>
    </html>
  );
}
