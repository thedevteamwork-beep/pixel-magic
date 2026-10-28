import type { ActionLink } from "@/ui/Button";

type NavLink = {
  label: string;
  href: string;
};

type FooterColumn = {
  title: string;
  links: NavLink[];
};

export const headerContent: { links: NavLink[]; cta: ActionLink } = {
  links: [
    { label: "Explore", href: "/" },
    { label: "Pricing", href: "#pricing" },
  ],
  cta: { label: "Get started", href: "#get-started" },
};

export const footerContent: {
  tagline: string;
  columns: FooterColumn[];
  socials: NavLink[];
  legal: NavLink[];
  copyright: string;
} = {
  tagline: "AI image & video studio",
  columns: [
    {
      title: "Create",
      links: [
        { label: "AI Video", href: "#ai-video" },
        { label: "AI Image", href: "#ai-image" },
        { label: "Image to Video", href: "#image-to-video" },
        { label: "Upscale", href: "#upscale" },
        { label: "Lip Sync", href: "#lip-sync" },
        { label: "AI Avatars", href: "#ai-avatars" },
      ],
    },
    {
      title: "Video models",
      links: [
        { label: "Kling", href: "#kling" },
        { label: "Seedance", href: "#seedance" },
        { label: "Veo", href: "#veo" },
        { label: "Wan", href: "#wan" },
      ],
    },
    {
      title: "Image models",
      links: [
        { label: "Flux", href: "#flux" },
        { label: "Nano Banana", href: "#nano-banana" },
        { label: "Ideogram", href: "#ideogram" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Blog", href: "#blog" },
        { label: "Help Center", href: "#help" },
        { label: "Prompt Guide", href: "#prompt-guide" },
        { label: "API Docs", href: "#api-docs" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", href: "#about" },
        { label: "Pricing", href: "#pricing" },
        { label: "Careers", href: "#careers" },
        { label: "Contact", href: "#contact" },
      ],
    },
  ],
  socials: [
    { label: "X / Twitter", href: "#x" },
    { label: "YouTube", href: "#youtube" },
    { label: "LinkedIn", href: "#linkedin" },
    { label: "Instagram", href: "#instagram" },
    { label: "Discord", href: "#discord" },
  ],
  legal: [
    { label: "Help center", href: "#help" },
    { label: "Terms", href: "#terms" },
    { label: "Privacy", href: "#privacy" },
  ],
  // Fixed string: reading the date at render time would make the page dynamic.
  copyright: "© 2026 Pixel Magic. All rights reserved.",
};
