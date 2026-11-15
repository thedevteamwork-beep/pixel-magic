import type { Metadata } from "next";
import { Suspense } from "react";
import { VideoWorkspace } from "@/components/video-generator/VideoWorkspace";
import { defaultVideoSettings, videoInspirations, videoModels } from "@/components/video-generator/constants";

export const metadata: Metadata = {
  title: "Video studio — Pixel Magic",
  description:
    "Direct your next shot. Turn a prompt or a still into motion, choose the camera move, and compare takes in Pixel Magic’s video studio.",
};

type VideoSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function VideoPage({ searchParams }: { searchParams: VideoSearchParams }) {
  return (
    <Suspense
      fallback={
        <div className="page-container py-12" role="status">
          Opening your video studio…
        </div>
      }
    >
      <WorkspaceFromQuery searchParams={searchParams} />
    </Suspense>
  );
}

async function WorkspaceFromQuery({ searchParams }: { searchParams: VideoSearchParams }) {
  const { model, preset } = await searchParams;
  const selectedModel = videoModels.find((item) => item.id === model)?.id ?? defaultVideoSettings.model;
  const selectedPreset = videoInspirations.find((item) => item.id === preset)?.id ?? null;
  return (
    <VideoWorkspace
      key={`${selectedModel}:${selectedPreset ?? ""}`}
      initialModel={selectedModel}
      initialPreset={selectedPreset}
    />
  );
}
