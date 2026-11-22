import type { Metadata } from "next";
import { Suspense } from "react";
import { ImageWorkspace } from "@/components/image-generator";
import { ImageSkeleton } from "@/components/image-generator/ImageSkeleton";
import { imageInspirations } from "@/components/image-generator/constants";

export const metadata: Metadata = {
  title: "Image studio — Pixel Magic",
  description:
    "A little idea. Your way. Create images, guide them with references and creative direction, in Pixel Magic’s image studio.",
};

type ImageSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function ImagePage({ searchParams }: { searchParams: ImageSearchParams }) {
  return (
    <Suspense fallback={<ImageSkeleton />}>
      <WorkspaceFromQuery searchParams={searchParams} />
    </Suspense>
  );
}

async function WorkspaceFromQuery({ searchParams }: { searchParams: ImageSearchParams }) {
  const { model, preset, sample, prompt, reference } = await searchParams;
  // Models come from the API at runtime: an unknown `?model=` falls back to the default image model there.
  const initialModel = typeof model === "string" ? model : null;
  const initialPreset = imageInspirations.find((item) => item.id === preset)?.id ?? null;
  // `?sample=1` (development only) shows sample results instead of calling the jobs API.
  const sampleMode = process.env.NODE_ENV !== "production" && sample === "1";
  return (
    <ImageWorkspace
      key={`${initialModel ?? ""}:${initialPreset ?? ""}:${sampleMode}`}
      initialModel={initialModel}
      initialPreset={initialPreset}
      initialPrompt={typeof prompt === "string" ? prompt.slice(0, 2000) : null}
      initialReferences={(Array.isArray(reference) ? reference : reference ? [reference] : []).filter(
        (item): item is string => typeof item === "string" && item.startsWith("/_next/static/media/"),
      )}
      sample={sampleMode}
    />
  );
}
