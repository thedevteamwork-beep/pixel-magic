import type { Metadata } from "next";
import { Suspense } from "react";
import { UpscaleSkeleton } from "@/components/image-upscaler/UpscaleSkeleton";
import { UpscaleWorkspace } from "@/components/image-upscaler/UpscaleWorkspace";

export const metadata: Metadata = {
  title: "Image upscaler — Pixel Magic",
  description:
    "Upscale your images with Topaz, SeedVR2, Recraft and Ideogram: sharper detail at up to 10× the size, compared side by side.",
};

export default function UpscalePage({ searchParams }: PageProps<"/upscale">) {
  return (
    <Suspense fallback={<UpscaleSkeleton />}>
      <WorkspaceFromQuery searchParams={searchParams} />
    </Suspense>
  );
}

// Reading the query is request-time data, so it sits inside <Suspense>.
async function WorkspaceFromQuery({ searchParams }: Pick<PageProps<"/upscale">, "searchParams">) {
  const { sample } = await searchParams;
  // `?sample=1` (development only) opens on a finished sample upscale instead of calling the API.
  const sampleMode = process.env.NODE_ENV !== "production" && sample === "1";
  return <UpscaleWorkspace key={String(sampleMode)} sample={sampleMode} />;
}
