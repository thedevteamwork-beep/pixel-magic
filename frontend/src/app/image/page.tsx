import type { Metadata } from "next";
import { Suspense } from "react";
import { ImageWorkspace } from "@/components/image-generator/ImageWorkspace";
import { defaultImageSettings, imageInspirations, imageModels } from "@/constants/image-generator";

export const metadata: Metadata = {
  title: "Image studio — Pixel Magic",
  description: "A little idea. Your way. Explore image creation, references, and creative direction in Pixel Magic’s image studio.",
};

type ImageSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function ImagePage({ searchParams }: { searchParams: ImageSearchParams }) {
  return <Suspense fallback={<div className="page-container py-12" role="status">Opening your image studio…</div>}>
    <WorkspaceFromQuery searchParams={searchParams} />
  </Suspense>;
}

async function WorkspaceFromQuery({ searchParams }: { searchParams: ImageSearchParams }) {
  const { model, preset } = await searchParams;
  const selectedModel = imageModels.find((item) => item.id === model)?.id ?? defaultImageSettings.model;
  const selectedPreset = imageInspirations.find((item) => item.id === preset)?.id ?? null;
  return <ImageWorkspace key={`${selectedModel}:${selectedPreset ?? ""}`} initialModel={selectedModel} initialPreset={selectedPreset} />;
}
