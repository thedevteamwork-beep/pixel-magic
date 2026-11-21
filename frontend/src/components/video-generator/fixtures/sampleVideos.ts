import { landingAssets } from "@/constants/landing-media";
import type { JobList, JobView } from "@/lib/api/types";
import type { MediaId } from "@/types/landing";
import sample from "./sampleVideos.json";

/**
 * Sample video history for working on the studio's UI without rendering
 * (open /video?sample=1 in development). The JSON is a `GET /v1/jobs`
 * response; its video URLs are `sample:<media id>` tokens for the landing
 * page's clips, and each sample has that clip's poster.
 */
const SAMPLE_MEDIA: readonly MediaId[] = ["desert", "ocean", "portrait", "product"];

function resolve(url: string | undefined): { url?: string; poster?: string } {
  if (!url?.startsWith("sample:")) return { url };
  const asset = landingAssets[url.slice("sample:".length) as MediaId];
  return { url: asset?.video, poster: asset?.image };
}

/** The sample jobs, newest finishing a minute ago, with each video's poster by job id. */
export function sampleVideoJobs(now = Date.now()): { jobs: JobView[]; posters: Record<string, string> } {
  const { jobs } = sample as unknown as JobList;
  const newest = Math.max(...jobs.map((job) => Date.parse(job.completedAt ?? job.createdAt)));
  const shift = now - 60_000 - newest;
  const at = (iso: string | null) => (iso ? new Date(Date.parse(iso) + shift).toISOString() : null);
  const posters: Record<string, string> = {};
  const shifted = jobs.map((job) => ({
    ...job,
    createdAt: at(job.createdAt)!,
    completedAt: at(job.completedAt),
    outputs: job.outputs.map((output) => {
      const { url, poster } = resolve(output.url);
      if (poster) posters[job.jobId] = poster;
      return { ...output, url };
    }),
  }));
  return { jobs: shifted, posters };
}

/** A finished job as if `input` had just been rendered, for sample mode's pretend Generate. */
export function sampleVideoJob(
  model: string,
  input: Record<string, unknown>,
  creditCost: number,
): { job: JobView; poster?: string } {
  const media = SAMPLE_MEDIA[Math.floor(Math.random() * SAMPLE_MEDIA.length)];
  const asset = landingAssets[media];
  const now = new Date().toISOString();
  return {
    job: {
      jobId: crypto.randomUUID(),
      projectId: null,
      status: "completed",
      model,
      input,
      creditCost,
      createdAt: now,
      completedAt: now,
      outputs: [{ index: 0, mimeType: "video/mp4", url: asset.video }],
    },
    poster: asset.image,
  };
}
