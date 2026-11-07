import { ApiError } from "@/lib/api/client";
import type { JobView } from "@/lib/api/types";

export class JobFailedError extends Error {
  job: JobView;

  constructor(job: JobView) {
    super(job.error?.message ?? "The job failed");
    this.name = "JobFailedError";
    this.job = job;
  }
}

export class PollLostError extends Error {
  constructor() {
    super("Lost connection while waiting for the job");
    this.name = "PollLostError";
  }
}

type PollParams = {
  get: (path: string, opts?: { signal?: AbortSignal }) => Promise<JobView>;
  intervalMs: number;
  signal?: AbortSignal;
  onUpdate?: (job: JobView) => void;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
  maxConsecutiveErrors?: number;
};

const DEFAULT_MAX_ERRORS = 5;

function abortError(): Error {
  return new DOMException("Polling stopped", "AbortError");
}

/** Waits `ms`, or rejects with an AbortError as soon as `signal` aborts. */
export function sleepUnlessAborted(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

// A 4xx will not fix itself (expired session, unknown job), so it stops polling.
function isClientError(error: unknown): boolean {
  return error instanceof ApiError && error.status >= 400 && error.status < 500;
}

// Network errors, non-JSON error bodies and 5xx are worth another try.
function isTransient(error: unknown): boolean {
  return error instanceof ApiError && !isClientError(error);
}

/**
 * Polls `GET /v1/jobs/:id` until the job completes (resolves with it) or fails
 * (throws JobFailedError). There is no attempt cap: the backend ends every job.
 */
export async function pollJob(jobId: string, p: PollParams): Promise<JobView> {
  const sleep = p.sleep ?? sleepUnlessAborted;
  const maxErrors = p.maxConsecutiveErrors ?? DEFAULT_MAX_ERRORS;
  let errorsInARow = 0;

  while (true) {
    if (p.signal?.aborted) throw abortError();

    try {
      const job = await p.get(`/v1/jobs/${jobId}`, { signal: p.signal });
      errorsInARow = 0;
      p.onUpdate?.(job);
      if (job.status === "completed") return job;
      if (job.status === "failed") throw new JobFailedError(job);
    } catch (error) {
      if (!isTransient(error)) throw error;
      errorsInARow += 1;
      if (errorsInARow >= maxErrors) throw new PollLostError();
    }

    await sleep(p.intervalMs, p.signal);
  }
}
