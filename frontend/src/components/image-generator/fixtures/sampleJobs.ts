import studioArchitecture from "@/assets/images/image-studio/architecture.png";
import studioCinematic from "@/assets/images/image-studio/cinematic.png";
import studioPortrait from "@/assets/images/image-studio/portrait.png";
import studioProduct from "@/assets/images/image-studio/product.png";
import landingDesert from "@/assets/images/landing/desert.jpg";
import landingOcean from "@/assets/images/landing/ocean.jpg";
import landingProduct from "@/assets/images/landing/product.jpg";
import type { JobList, JobView } from "@/lib/api/types";
import sample from "./sampleJobs.json";

/**
 * Sample image history for working on the studio's UI without generating
 * (open /image?sample=1 in development). The JSON is a `GET /v1/jobs`
 * response, so it runs through the same mapping as real history. Image URLs
 * are `sample:<name>` tokens, since bundled images only get URLs at build.
 */
const SAMPLE_IMAGES: Record<string, string> = {
  "studio-product": studioProduct.src,
  "studio-portrait": studioPortrait.src,
  "studio-cinematic": studioCinematic.src,
  "studio-architecture": studioArchitecture.src,
  "landing-product": landingProduct.src,
  "landing-desert": landingDesert.src,
  "landing-ocean": landingOcean.src,
};

function resolveUrl(url: string | undefined): string | undefined {
  return url?.startsWith("sample:") ? SAMPLE_IMAGES[url.slice("sample:".length)] : url;
}

/** The sample jobs, timestamps shifted so the newest finished a minute ago. */
export function sampleImageJobs(now = Date.now()): JobView[] {
  // JSON imports widen literals (`status` to string), so assert the API shape.
  const { jobs } = sample as unknown as JobList;
  const newest = Math.max(...jobs.map((job) => Date.parse(job.completedAt ?? job.createdAt)));
  const shift = now - 60_000 - newest;
  const at = (iso: string | null) => (iso ? new Date(Date.parse(iso) + shift).toISOString() : null);
  return jobs.map((job) => ({
    ...job,
    createdAt: at(job.createdAt)!,
    completedAt: at(job.completedAt),
    outputs: job.outputs.map((output) => ({ ...output, url: resolveUrl(output.url) })),
  }));
}

const SAMPLE_OUTPUTS = Object.keys(SAMPLE_IMAGES);

/** A finished job as if `request` had just been generated, for sample mode's pretend Generate. */
export function sampleGeneration(request: {
  model: string;
  prompt: string;
  options: Record<string, unknown>;
  count: number;
  creditCost: number;
}): JobView {
  const now = new Date().toISOString();
  const first = Math.floor(Math.random() * SAMPLE_OUTPUTS.length);
  return {
    jobId: crypto.randomUUID(),
    projectId: null,
    status: "completed",
    model: request.model,
    input: { ...request.options, prompt: request.prompt },
    creditCost: request.creditCost,
    createdAt: now,
    completedAt: now,
    outputs: Array.from({ length: Math.max(1, request.count) }, (_, index) => ({
      index,
      mimeType: "image/png",
      url: SAMPLE_IMAGES[SAMPLE_OUTPUTS[(first + index) % SAMPLE_OUTPUTS.length]],
    })),
  };
}
