import after from "@/assets/images/image-studio/product.png";
import type { JobView } from "@/lib/api/types";
import before from "./perfume-small.jpg";
import sample from "./sampleUpscale.json";

/**
 * A finished upscale for working on the upscaler's UI without running one
 * (open /upscale?sample=1 in development). The JSON holds a `GET /v1/jobs/:id`
 * response; its image URLs are `sample:` tokens for bundled images: a small
 * JPEG as the upload, and the same picture at 4× as the result.
 */
const IMAGES: Record<string, string> = { "sample:before": before.src, "sample:after": after.src };

/** The sample's input image, as a file the upscaler can load. */
export async function sampleSourceFile(): Promise<File> {
  const response = await fetch(IMAGES[sample.source.url]);
  const blob = await response.blob();
  return new File([blob], sample.source.name, { type: blob.type || "image/jpeg" });
}

/** The sample's finished job, finishing a minute ago, optionally with other settings. */
export function sampleUpscaleJob(input?: Record<string, unknown>, modelKey?: string): JobView {
  const job = sample.job as unknown as JobView;
  const now = Date.now();
  return {
    ...job,
    jobId: input ? crypto.randomUUID() : job.jobId,
    model: modelKey ?? job.model,
    input: input ?? job.input,
    createdAt: new Date(now - 80_000).toISOString(),
    completedAt: new Date(now - 60_000).toISOString(),
    outputs: job.outputs.map((output) => ({ ...output, url: output.url && IMAGES[output.url] })),
  };
}
