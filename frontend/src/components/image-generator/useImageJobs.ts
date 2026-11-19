"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, newIdempotencyKey } from "@/lib/api/client";
import type { JobList, JobView } from "@/lib/api/types";
import { notifyCreditsChanged } from "@/lib/balance";
import { pollJob } from "@/lib/generate/pollJob";
import { submitGeneration } from "@/lib/generate/submit";
import { uploadFile } from "@/lib/generate/uploadFile";
import { imageCount } from "@/lib/image-generator/models";
import { isActiveJob, jobToResults, mergeResults, urlExpired } from "@/lib/image-generator/results";
import type { ImageOptionValue, ImageResult, StudioModel } from "@/types/image-generator";
import { HISTORY_PAGE_SIZE, IMAGE_POLL_INTERVAL_MS, IMAGE_WAIT_LIMIT_MS, SAMPLE_RENDER_MS } from "./constants";
import { sampleGeneration, sampleImageJobs } from "./fixtures/sampleJobs";

/** The studio stopped waiting on a job that is still running; it will show up in History. */
export class StillRunningError extends Error {
  constructor() {
    super("The job is still running");
    this.name = "StillRunningError";
  }
}

/** A job being made right now, shown as placeholders. */
export type ActiveRender = { count: number; modelName: string };

export type GenerateRequest = {
  model: StudioModel;
  /** The full prompt: the brief plus any creative guidance. */
  prompt: string;
  options: Record<string, ImageOptionValue>;
  files: File[];
};

/** One Generate click. Kept across retries so a retry can never create or upload twice. */
type Attempt = { key: string; signature: string; uploadIds: (string | undefined)[] };

// A 4xx means the server refused: nothing was created, so a retry may use a new key.
function refused(error: unknown): boolean {
  return error instanceof ApiError && error.status >= 400 && error.status < 500;
}

function signatureOf(request: GenerateRequest): string {
  const files = request.files.map((file) => `${file.name}:${file.size}:${file.lastModified}`);
  return JSON.stringify([request.model.key, request.prompt, request.options, files]);
}

/**
 * The studio's link to the jobs API: generating, following a job to its
 * images, the signed-in user's image history, and resuming a job still
 * running from an earlier visit.
 *
 * With `sample` (development only) the history is the sample JSON and
 * Generate only pretends, so the UI can be worked on without calling the API.
 */
export function useImageJobs(models: readonly StudioModel[] | null, signedIn: boolean | null, sample = false) {
  const [results, setResults] = useState<ImageResult[]>([]);
  const [render, setRender] = useState<ActiveRender | null>(null);
  const attempt = useRef<Attempt | null>(null);
  const polling = useRef<AbortController | null>(null);
  const modelsRef = useRef(models);
  useEffect(() => {
    modelsRef.current = models;
  });

  /** Polls a created job until it completes; its images join the results. Throws if it fails. */
  const follow = useCallback(async (job: JobView, active: ActiveRender): Promise<ImageResult[]> => {
    polling.current?.abort();
    const controller = new AbortController();
    polling.current = controller;
    setRender(active);
    // The wait is measured from the job's creation, so a resumed old job is checked briefly, not for another 12 minutes.
    const created = Date.parse(job.createdAt);
    const waited = Number.isFinite(created) ? Date.now() - created : 0;
    let outOfTime = false;
    const deadline = setTimeout(
      () => {
        outOfTime = true;
        controller.abort();
      },
      Math.max(IMAGE_WAIT_LIMIT_MS - waited, IMAGE_POLL_INTERVAL_MS * 2),
    );
    try {
      const done = await pollJob(job.jobId, {
        get: api.get,
        intervalMs: IMAGE_POLL_INTERVAL_MS,
        signal: controller.signal,
      }).catch((error: unknown) => {
        throw outOfTime ? new StillRunningError() : error;
      });
      const fresh = jobToResults(done, modelsRef.current ?? []);
      setResults((current) => mergeResults(current, fresh));
      return fresh;
    } finally {
      clearTimeout(deadline);
      if (polling.current === controller) {
        polling.current = null;
        setRender(null);
      }
      // Completed jobs capture credits; failed ones return them.
      notifyCreditsChanged();
    }
  }, []);

  const loadHistory = useCallback(async (signal?: AbortSignal): Promise<JobView[]> => {
    const { jobs } = await api.get<JobList>(`/v1/jobs?kind=image&limit=${HISTORY_PAGE_SIZE}`, { signal });
    setResults((current) =>
      mergeResults(
        current,
        jobs.flatMap((job) => jobToResults(job, modelsRef.current ?? [])),
      ),
    );
    return jobs;
  }, []);

  // Sample mode: the sample history, named once the models are known.
  useEffect(() => {
    if (!sample) return;
    // Fixtures stand in for the history request, so they are set the same way, from an effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResults((current) =>
      mergeResults(
        current,
        sampleImageJobs().flatMap((job) => jobToResults(job, models ?? [])),
      ),
    );
  }, [sample, models]);

  // Once signed in and the models are known: load the history and pick up a job still running.
  useEffect(() => {
    if (!signedIn || !models || sample) return;
    const controller = new AbortController();
    loadHistory(controller.signal)
      .then((jobs) => {
        const running = jobs.find(isActiveJob);
        const model = running && models.find((item) => item.key === running.model);
        if (!running || !model || polling.current) return;
        return follow(running, {
          count: imageCount(model, running.input as Record<string, ImageOptionValue>),
          modelName: model.name,
        });
      })
      // History is a convenience: a failure leaves the studio usable, and a failed resumed job shows in history.
      .catch(() => undefined);
    return () => controller.abort();
  }, [signedIn, models, sample, loadHistory, follow]);

  // Signed URLs last an hour; coming back to the tab refreshes any that are about to expire.
  useEffect(() => {
    if (!signedIn || sample) return;
    const refresh = () => {
      if (document.visibilityState === "visible" && results.some((item) => urlExpired(item, Date.now()))) {
        void loadHistory().catch(() => undefined);
      }
    };
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, [signedIn, sample, results, loadHistory]);

  // Stop polling when the studio closes; the job keeps running and appears in history.
  useEffect(() => () => polling.current?.abort(), []);

  /** Uploads references, creates the job and waits for its images. Throws on any failure. */
  const generate = useCallback(
    async (request: GenerateRequest): Promise<ImageResult[]> => {
      const signature = signatureOf(request);
      if (attempt.current?.signature !== signature) {
        attempt.current = { key: newIdempotencyKey(), signature, uploadIds: [] };
      }
      const current = attempt.current;
      const active = { count: imageCount(request.model, request.options), modelName: request.model.name };
      setRender(active);
      if (sample) {
        await new Promise((resolve) => setTimeout(resolve, SAMPLE_RENDER_MS));
        const job = sampleGeneration({
          model: request.model.key,
          prompt: request.prompt,
          options: request.options,
          count: active.count,
          creditCost: request.model.credits.min,
        });
        const fresh = jobToResults(job, modelsRef.current ?? []);
        setResults((current) => mergeResults(current, fresh));
        setRender(null);
        return fresh;
      }
      let job: JobView;
      try {
        job = await submitGeneration({
          api,
          uploadFile,
          model: request.model.source,
          prompt: request.prompt,
          values: request.options,
          files: request.files,
          idempotencyKey: current.key,
          uploadIds: current.uploadIds,
          onUploaded: (uploadId, index) => {
            current.uploadIds[index] = uploadId;
          },
        });
      } catch (error) {
        // Unless the server refused, the key and uploads stay: "Try again" resumes, never duplicates.
        if (refused(error)) attempt.current = null;
        setRender(null);
        throw error;
      }
      attempt.current = null;
      notifyCreditsChanged();
      return follow(job, active);
    },
    [follow, sample],
  );

  return { results, render, generate };
}
