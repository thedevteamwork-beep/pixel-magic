"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, newIdempotencyKey } from "@/lib/api/client";
import type { JobList, JobView } from "@/lib/api/types";
import { notifyCreditsChanged } from "@/lib/balance";
import { JobFailedError, pollJob, sleepUnlessAborted } from "@/lib/generate/pollJob";
import { submitGeneration } from "@/lib/generate/submit";
import { uploadFile } from "@/lib/generate/uploadFile";
import { splitImagePrompt } from "@/lib/image-generator/guidance";
import { imageCount, shapeOf } from "@/lib/image-generator/models";
import { isActiveJob, jobToResults, mergeResults, urlExpired } from "@/lib/image-generator/results";
import { generationError, pruneRuns, runsBeforeNew } from "@/lib/image-generator/runs";
import type { ImageOptionValue, ImageResult, ImageRun, StudioModel } from "@/types/image-generator";
import { HISTORY_PAGE_SIZE, IMAGE_POLL_INTERVAL_MS, IMAGE_WAIT_LIMIT_MS, SAMPLE_RENDER_MS } from "./constants";
import { sampleGeneration, sampleImageJobs } from "./fixtures/sampleJobs";

/** The studio stopped waiting on a job that is still running; it will show up in History. */
export class StillRunningError extends Error {
  constructor() {
    super("The job is still running");
    this.name = "StillRunningError";
  }
}

export type GenerateRequest = {
  model: StudioModel;
  /** The full prompt: the brief plus any creative guidance. */
  prompt: string;
  options: Record<string, ImageOptionValue>;
  files: File[];
};

/** What happened to a run, so the studio can tell the user. */
export type RunEvents = {
  /** `onCanvas`: the user was looking at this run when it finished. */
  onDone: (run: ImageRun, results: ImageResult[], onCanvas: boolean) => void;
  onFailed: (run: ImageRun, error: unknown, onCanvas: boolean) => void;
  /** Waited too long; the job carries on and will appear in History. */
  onStillRunning: (run: ImageRun) => void;
};

/** One Generate click. Kept across retries so a retry can never create or upload twice. */
type Attempt = { key: string; uploadIds: (string | undefined)[] };
type RunSource = { request: GenerateRequest; attempt: Attempt };

function newAttempt(): Attempt {
  return { key: newIdempotencyKey(), uploadIds: [] };
}

// A 4xx means the server refused: nothing was created, so a retry may use a new key.
function refused(error: unknown): boolean {
  return error instanceof ApiError && error.status >= 400 && error.status < 500;
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function newRun(
  fields: Pick<ImageRun, "jobId" | "prompt" | "modelName" | "count" | "ratio" | "startedAt" | "canRetry">,
) {
  return { id: crypto.randomUUID(), status: "running", error: null, seen: false, ...fields } satisfies ImageRun;
}

function runFor(model: StudioModel, input: Record<string, unknown>, prompt: string) {
  return {
    prompt: splitImagePrompt(prompt).brief || prompt,
    modelName: model.name,
    count: imageCount(model, input as Record<string, ImageOptionValue>),
    ratio: shapeOf(model, input)?.ratio ?? "1:1",
  };
}

/**
 * The studio's link to the jobs API: generating, following each job to its
 * images, the signed-in user's image history, and resuming jobs still running
 * from an earlier visit.
 *
 * Every Generate is a run of its own, so several can be made at once: a new
 * one never stops or hides an earlier one. `viewing` is the run on the canvas.
 *
 * With `sample` (development only) the history is the sample JSON and
 * Generate only pretends, so the UI can be worked on without calling the API.
 */
export function useImageJobs(
  models: readonly StudioModel[] | null,
  signedIn: boolean | null,
  sample: boolean,
  events: RunEvents,
) {
  const [results, setResults] = useState<ImageResult[]>([]);
  const [runs, setRuns] = useState<ImageRun[]>([]);
  const [viewing, setViewing] = useState<string | null>(null);
  const sources = useRef(new Map<string, RunSource>());
  const polls = useRef(new Map<string, AbortController>());
  /** Jobs this visit already follows, so resuming from History never follows one twice. */
  const knownJobs = useRef(new Set<string>());
  const latest = useRef({ models, events, viewing });
  useEffect(() => {
    latest.current = { models, events, viewing };
  });

  const show = useCallback((id: string | null) => {
    setViewing(id);
    latest.current.viewing = id;
  }, []);

  const patchRun = useCallback((id: string, patch: Partial<ImageRun>) => {
    setRuns((current) => current.map((run) => (run.id === id ? { ...run, ...patch } : run)));
  }, []);

  /** Shows a run on the canvas (or, with null, the newest image); seen results leave the strip. */
  const view = useCallback(
    (id: string | null) => {
      show(id);
      setRuns((current) =>
        pruneRuns(
          current.map((run) => (run.id === id && run.status === "done" ? { ...run, seen: true } : run)),
          id,
        ),
      );
    },
    [show],
  );

  /** Polls a created job until it completes; its images join the results. Throws if it fails. */
  const follow = useCallback(async (job: JobView, signal: AbortSignal): Promise<ImageResult[]> => {
    // The wait is measured from the job's creation, so a resumed old job is checked briefly, not for another 12 minutes.
    const created = Date.parse(job.createdAt);
    const waited = Number.isFinite(created) ? Date.now() - created : 0;
    const timer = new AbortController();
    let outOfTime = false;
    const deadline = setTimeout(
      () => {
        outOfTime = true;
        timer.abort();
      },
      Math.max(IMAGE_WAIT_LIMIT_MS - waited, IMAGE_POLL_INTERVAL_MS * 2),
    );
    try {
      const done = await pollJob(job.jobId, {
        get: api.get,
        intervalMs: IMAGE_POLL_INTERVAL_MS,
        signal: AbortSignal.any([signal, timer.signal]),
      }).catch((error: unknown) => {
        throw outOfTime ? new StillRunningError() : error;
      });
      return jobToResults(done, latest.current.models ?? []);
    } finally {
      clearTimeout(deadline);
      // Completed jobs capture credits; failed ones return them.
      notifyCreditsChanged();
    }
  }, []);

  /** Creates the run's job (or pretends to, in sample mode). */
  const create = useCallback(
    async (run: ImageRun, signal: AbortSignal): Promise<JobView> => {
      const source = sources.current.get(run.id);
      if (!source) throw new Error("This generation can’t be started again.");
      const { request, attempt } = source;
      if (sample) {
        await sleepUnlessAborted(SAMPLE_RENDER_MS * (0.7 + Math.random() * 0.6), signal);
        const job = sampleGeneration({
          model: request.model.key,
          prompt: request.prompt,
          options: request.options,
          count: run.count,
          creditCost: request.model.credits.min,
        });
        // Sample mode can show a failure too: put "fail" in the prompt.
        if (/\bfail\b/i.test(request.prompt)) {
          throw new JobFailedError({
            ...job,
            status: "failed",
            outputs: [],
            error: { code: "SAMPLE_FAILED", message: "The model couldn’t make this image." },
          });
        }
        return job;
      }
      try {
        const job = await submitGeneration({
          api,
          uploadFile,
          model: request.model.source,
          prompt: request.prompt,
          values: request.options,
          files: request.files,
          idempotencyKey: attempt.key,
          uploadIds: attempt.uploadIds,
          onUploaded: (uploadId, index) => {
            attempt.uploadIds[index] = uploadId;
          },
        });
        notifyCreditsChanged();
        return job;
      } catch (error) {
        // Unless the server refused, the key and uploads stay: Retry resumes, never duplicates.
        if (refused(error)) source.attempt = newAttempt();
        throw error;
      }
    },
    [sample],
  );

  /** Takes a run from wherever it is to done, failed or "still running", and reports it. */
  const settle = useCallback(
    async (run: ImageRun, existing?: JobView) => {
      const controller = new AbortController();
      polls.current.set(run.id, controller);
      try {
        const job = existing ?? (await create(run, controller.signal));
        knownJobs.current.add(job.jobId);
        patchRun(run.id, { jobId: job.jobId });
        const fresh = sample ? jobToResults(job, latest.current.models ?? []) : await follow(job, controller.signal);
        if (!fresh.length) throw new Error("No image came back. Please try again.");
        setResults((current) => mergeResults(current, fresh));
        sources.current.delete(run.id);
        const onCanvas = latest.current.viewing === run.id;
        patchRun(run.id, { jobId: job.jobId, status: "done", seen: onCanvas });
        latest.current.events.onDone(run, fresh, onCanvas);
      } catch (error) {
        // Leaving the studio stops the waiting; the job carries on and appears in History.
        if (controller.signal.aborted && isAbort(error)) return;
        if (error instanceof StillRunningError) {
          sources.current.delete(run.id);
          setRuns((current) => current.filter((item) => item.id !== run.id));
          if (latest.current.viewing === run.id) show(null);
          latest.current.events.onStillRunning(run);
          return;
        }
        patchRun(run.id, { status: "failed", error: generationError(error) });
        latest.current.events.onFailed(run, error, latest.current.viewing === run.id);
      } finally {
        if (polls.current.get(run.id) === controller) polls.current.delete(run.id);
      }
    },
    [create, follow, patchRun, sample, show],
  );

  /** Starts a new run and shows it on the canvas; earlier runs carry on in their cards. */
  const generate = useCallback(
    (request: GenerateRequest): ImageRun => {
      const run = newRun({
        ...runFor(request.model, request.options, request.prompt),
        jobId: null,
        startedAt: Date.now(),
        canRetry: true,
      });
      sources.current.set(run.id, { request, attempt: newAttempt() });
      setRuns((current) => [run, ...runsBeforeNew(current)]);
      show(run.id);
      void settle(run);
      return run;
    },
    [settle, show],
  );

  /** Tries a failed run again with the same request, and shows it. */
  const retry = useCallback(
    (id: string) => {
      const run = runs.find((item) => item.id === id);
      if (!run || run.status !== "failed" || !run.canRetry) return;
      const restarted = { ...run, status: "running" as const, error: null, startedAt: Date.now() };
      patchRun(id, restarted);
      show(id);
      void settle(restarted);
    },
    [runs, patchRun, settle, show],
  );

  /** Clears a failed run's card. */
  const dismiss = useCallback(
    (id: string) => {
      sources.current.delete(id);
      setRuns((current) => current.filter((run) => run.id !== id));
      if (latest.current.viewing === id) show(null);
    },
    [show],
  );

  const loadHistory = useCallback(async (signal?: AbortSignal): Promise<JobView[]> => {
    const { jobs } = await api.get<JobList>(`/v1/jobs?kind=image&limit=${HISTORY_PAGE_SIZE}`, { signal });
    setResults((current) =>
      mergeResults(
        current,
        jobs.flatMap((job) => jobToResults(job, latest.current.models ?? [])),
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

  // Once signed in and the models are known: load the history and pick up every job still running.
  useEffect(() => {
    if (!signedIn || !models || sample) return;
    const controller = new AbortController();
    loadHistory(controller.signal)
      .then((jobs) => {
        const resumed = jobs.filter(isActiveJob).flatMap((job) => {
          const model = models.find((item) => item.key === job.model);
          if (!model || knownJobs.current.has(job.jobId)) return [];
          knownJobs.current.add(job.jobId);
          const prompt = typeof job.input.prompt === "string" ? job.input.prompt : "";
          const started = Date.parse(job.createdAt);
          return [
            {
              job,
              run: newRun({
                ...runFor(model, job.input, prompt),
                jobId: job.jobId,
                startedAt: Number.isFinite(started) ? started : Date.now(),
                canRetry: false,
              }),
            },
          ];
        });
        if (!resumed.length) return;
        setRuns((current) => [...current, ...resumed.map((item) => item.run)]);
        // The newest one goes on the canvas, as if the user had never left.
        if (latest.current.viewing === null) show(resumed[0].run.id);
        for (const { job, run } of resumed) void settle(run, job);
      })
      // History is a convenience: a failure leaves the studio usable.
      .catch(() => undefined);
    return () => controller.abort();
  }, [signedIn, models, sample, loadHistory, settle, show]);

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

  // Stop polling when the studio closes; the jobs keep running and appear in History.
  useEffect(() => {
    const active = polls.current;
    return () => {
      for (const controller of active.values()) controller.abort();
    };
  }, []);

  return { results, runs, viewing, view, generate, retry, dismiss };
}
