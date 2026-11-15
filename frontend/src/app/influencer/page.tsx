import type { Metadata } from "next";
import { Suspense } from "react";
import { InfluencerWorkspace } from "@/components/ai-influencer/InfluencerWorkspace";

export const metadata: Metadata = {
  title: "AI Influencer — Pixel Magic",
  description:
    "Design a consistent AI influencer: choose a look, shape every detail, and save your character for every campaign.",
};

export default function InfluencerPage({ searchParams }: PageProps<"/influencer">) {
  return (
    <Suspense>
      <InfluencerWorkspaceFromQuery searchParams={searchParams} />
    </Suspense>
  );
}

// Reading the query is request-time data, so it sits inside <Suspense>.
async function InfluencerWorkspaceFromQuery({ searchParams }: Pick<PageProps<"/influencer">, "searchParams">) {
  const { project } = await searchParams;
  return <InfluencerWorkspace initialProjectId={typeof project === "string" ? project : null} />;
}
