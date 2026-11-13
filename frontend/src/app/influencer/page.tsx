import type { Metadata } from "next";
import { InfluencerWorkspace } from "@/components/ai-influencer/InfluencerWorkspace";

export const metadata: Metadata = {
  title: "AI Influencer — Pixel Magic",
  description:
    "Design a consistent AI influencer: choose a look, shape every detail, and save your character for every campaign.",
};

export default function InfluencerPage() {
  return <InfluencerWorkspace />;
}
