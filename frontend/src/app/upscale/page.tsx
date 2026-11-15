import type { Metadata } from "next";
import { UpscaleWorkspace } from "@/components/image-upscaler/UpscaleWorkspace";

export const metadata: Metadata = {
  title: "Image upscaler — Pixel Magic",
  description:
    "Enlarge your images with a simple upload, scale, and download workflow. Try Pixel Magic’s image upscaler preview.",
};

export default function UpscalePage() {
  return <UpscaleWorkspace />;
}
