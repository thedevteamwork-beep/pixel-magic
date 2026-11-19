import type { Metadata } from "next";
import { Suspense } from "react";
import { ImageWorkspace } from "@/components/image-generator";
import { imageInspirations } from "@/components/image-generator/constants";

export const metadata: Metadata = {
  title: "Image studio — Pixel Magic",
  description:
    "A little idea. Your way. Create images, guide them with references and creative direction, in Pixel Magic’s image studio.",
};

type ImageSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function ImagePage({ searchParams }: { searchParams: ImageSearchParams }) {
  return (
    <Suspense
      fallback={
        <div className="page-container py-12" role="status">
          Opening your image studio…
        </div>
      }
    >
      <WorkspaceFromQuery searchParams={searchParams} />
    </Suspense>
  );
}

async function WorkspaceFromQuery({ searchParams }: { searchParams: ImageSearchParams }) {
  const { model, preset, sample } = await searchParams;
  // Models come from the API at runtime: an unknown `?model=` falls back to the first image model there.
  const initialModel = typeof model === "string" ? model : null;
  const initialPreset = imageInspirations.find((item) => item.id === preset)?.id ?? null;
  // `?sample=1` (development only) shows sample results instead of calling the jobs API.
  const sampleMode = process.env.NODE_ENV !== "production" && sample === "1";
  return (
    <ImageWorkspace
      key={`${initialModel ?? ""}:${initialPreset ?? ""}:${sampleMode}`}
      initialModel={initialModel}
      initialPreset={initialPreset}
      sample={sampleMode}
    />
  );
}
