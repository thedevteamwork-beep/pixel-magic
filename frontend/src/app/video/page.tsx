import type { Metadata } from "next";
import { Suspense } from "react";
import { VideoSkeleton } from "@/components/video-generator/VideoSkeleton";
import { VideoWorkspace } from "@/components/video-generator/VideoWorkspace";
import { discoveryTemplates } from "@/components/landing/constants";
import { landingAssets } from "@/constants/landing-media";
import { DEFAULT_VIDEO_MODEL, videoInspirations } from "@/components/video-generator/constants";

export const metadata: Metadata = {
  title: "Video studio — Pixel Magic",
  description:
    "Direct your next shot. Turn a prompt or a still into motion, choose the camera move, and compare takes in Pixel Magic’s video studio.",
};

type VideoSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function VideoPage({ searchParams }: { searchParams: VideoSearchParams }) {
  return (
    <Suspense fallback={<VideoSkeleton />}>
      <WorkspaceFromQuery searchParams={searchParams} />
    </Suspense>
  );
}

async function WorkspaceFromQuery({ searchParams }: { searchParams: VideoSearchParams }) {
  const { model, preset, sample, template } = await searchParams;
  // Models come from the API at runtime: an unknown `?model=` falls back to the default there.
  const selectedModel = typeof model === "string" ? model : DEFAULT_VIDEO_MODEL;
  const selectedPreset = videoInspirations.find((item) => item.id === preset)?.id ?? null;
  const selectedTemplate =
    typeof template === "string"
      ? discoveryTemplates.find((item) => item.id === template && item.mediaType === "video")
      : undefined;
  const initialPrompt = selectedTemplate?.prompt;
  const initialReferenceUrls = selectedTemplate?.referenceAssets?.map((reference) => landingAssets[reference].image);
  // `?sample=1` (development only) shows sample videos and only pretends to render.
  const sampleMode = process.env.NODE_ENV !== "production" && sample === "1";
  return (
    <VideoWorkspace
      key={`${selectedModel}:${selectedPreset ?? ""}:${template ?? ""}:${sampleMode}`}
      initialModel={selectedModel}
      initialPreset={selectedPreset}
      initialPrompt={initialPrompt}
      initialReferenceUrls={initialReferenceUrls}
      sample={sampleMode}
    />
  );
}
