import { api, newIdempotencyKey } from "@/lib/api/client";
import type { JobView } from "@/lib/api/types";
import { notifyCreditsChanged } from "@/lib/balance";
import { pollJob } from "@/lib/generate/pollJob";
import { submitGeneration } from "@/lib/generate/submit";
import { uploadFile } from "@/lib/generate/uploadFile";
import { jobToVideoResults, jobValues, VIDEO_FIELDS } from "@/lib/video-generator/models";
import type { VideoModel, VideoResult, VideoSettings } from "@/types/video-generator";
import { SAMPLE_RENDER_MS, VIDEO_POLL_INTERVAL_MS, VIDEO_WAIT_LIMIT_MS } from "../constants";
import { sampleVideoJob } from "../fixtures/sampleVideos";

/** The studio stopped waiting on a render that is still running; it appears in the feed on a later visit. */
export class StillRenderingError extends Error {
  constructor() {
    super("This is taking longer than usual. It keeps rendering and will appear here when you come back.");
    this.name = "StillRenderingError";
  }
}

export type RenderRequest = {
  model: VideoModel;
  /** Fitted to the model; `count` videos are made, each its own job. */
  settings: VideoSettings;
  prompt: string;
  /** The start image, for image to video. */
  start: File | null;
  /** Shown on the results until their video loads. */
  poster?: string;
  /** Development only: pretend, without the API. */
  sample?: boolean;
  /** The ids each job is created with, kept across a retry so it never creates twice. */
  keys: string[];
};

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });

/** Polls one job to the end, giving up (not failing) after the wait limit, counted from when it was created. */
export async function followJob(job: JobView, signal: AbortSignal): Promise<JobView> {
  const waited = Date.now() - Date.parse(job.createdAt);
  const deadline = new AbortController();
  const timer = setTimeout(
    () => deadline.abort(),
    Math.max(VIDEO_WAIT_LIMIT_MS - (Number.isFinite(waited) ? waited : 0), 10_000),
  );
  const stop = () => deadline.abort();
  signal.addEventListener("abort", stop, { once: true });
  try {
    return await pollJob(job.jobId, { get: api.get, intervalMs: VIDEO_POLL_INTERVAL_MS, signal: deadline.signal });
  } catch (error) {
    if (deadline.signal.aborted && !signal.aborted) throw new StillRenderingError();
    throw error;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", stop);
  }
}

/**
 * Makes the videos: uploads the start image once, creates one job per video
 * and waits for all of them. Returns every video that finished; throws only
 * when none did (the first failure). Credits are reserved per job and
 * returned for any that fail.
 */
export async function renderVideos(
  request: RenderRequest,
  batchId: string,
  signal: AbortSignal,
): Promise<VideoResult[]> {
  const { model, settings, prompt, start, poster } = request;
  const values = jobValues(model, settings);

  if (request.sample) {
    await wait(SAMPLE_RENDER_MS, signal);
    const input = { ...values, prompt, ...(start ? { [VIDEO_FIELDS.image]: ["sample-upload"] } : {}) };
    return request.keys.flatMap(() => {
      const { job, poster: samplePoster } = sampleVideoJob(model.id, input, model.source.credits.min);
      return jobToVideoResults(job, { batchId, poster: poster ?? samplePoster });
    });
  }

  const uploadIds: (string | undefined)[] = [];
  const created: JobView[] = [];
  try {
    for (const key of request.keys) {
      created.push(
        await submitGeneration({
          api,
          uploadFile,
          model: model.source,
          prompt,
          values,
          files: start ? [start] : [],
          idempotencyKey: key,
          // The first job uploads the image; the rest reuse it.
          uploadIds,
          onUploaded: (uploadId, index) => {
            uploadIds[index] = uploadId;
          },
        }),
      );
    }
  } finally {
    if (created.length) notifyCreditsChanged();
  }

  const outcomes = await Promise.allSettled(created.map((job) => followJob(job, signal)));
  notifyCreditsChanged();
  const results = outcomes.flatMap((outcome) =>
    outcome.status === "fulfilled" ? jobToVideoResults(outcome.value, { batchId, poster }) : [],
  );
  if (!results.length) {
    const failure = outcomes.find((outcome) => outcome.status === "rejected");
    throw failure?.status === "rejected" ? failure.reason : new Error("No video was made.");
  }
  return results;
}

export function newRenderKeys(count: number): string[] {
  return Array.from({ length: count }, () => newIdempotencyKey());
}
