import type { JobStatus, JobView } from "@/lib/api/types";
import type { ImageResult, StudioModel } from "@/types/image-generator";
import { splitImagePrompt } from "./guidance";
import { shapeOf } from "./models";

const ACTIVE: ReadonlySet<JobStatus> = new Set(["queued", "submitting", "submitted", "finalizing"]);

/** Still being made: polling it will eventually complete or fail it. */
export function isActiveJob(job: Pick<JobView, "status">): boolean {
  return ACTIVE.has(job.status);
}

/** The images of a completed job, newest job first in a list; other jobs have none. */
export function jobToResults(job: JobView, models: readonly StudioModel[]): ImageResult[] {
  if (job.status !== "completed") return [];
  const model = models.find((item) => item.key === job.model);
  const { brief, guidance } = splitImagePrompt(typeof job.input.prompt === "string" ? job.input.prompt : "");
  const shape = shapeOf(model, job.input);
  return job.outputs.flatMap((output) =>
    output.url
      ? [
          {
            id: `${job.jobId}:${output.index}`,
            jobId: job.jobId,
            url: output.url,
            expiresAt: output.expiresAt ?? null,
            mimeType: output.mimeType,
            alt: brief ? `Generated image: ${brief}` : "Generated image",
            prompt: brief,
            guidance,
            model: job.model,
            modelName: model?.name ?? job.model,
            aspectRatio: shape?.ratio ?? "1:1",
            sizeLabel: shape?.label ?? "Default",
            options: job.input,
            createdAt: job.completedAt ?? job.createdAt,
            favorite: false,
          },
        ]
      : [],
  );
}

/** Newer first, one entry per id: a fresh copy (new signed URL) replaces the old one. */
export function mergeResults(current: readonly ImageResult[], incoming: readonly ImageResult[]): ImageResult[] {
  const byId = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) byId.set(item.id, item);
  return [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
}

/** True when a signed URL has expired or will within `marginMs`. */
export function urlExpired(item: Pick<ImageResult, "expiresAt">, now: number, marginMs = 60_000): boolean {
  return item.expiresAt !== null && Date.parse(item.expiresAt) - marginMs <= now;
}

const EXTENSIONS: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

export function downloadName(item: Pick<ImageResult, "jobId" | "id" | "mimeType">): string {
  const index = item.id.split(":").at(-1) ?? "0";
  return `pixel-magic-${item.jobId.slice(0, 8)}-${Number(index) + 1}.${EXTENSIONS[item.mimeType] ?? "jpg"}`;
}
