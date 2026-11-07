"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api/client";
import type { JobView, ModelKind } from "@/lib/api/types";
import { notifyCreditsChanged } from "@/lib/balance";
import { PollLostError, pollJob } from "@/lib/generate/pollJob";

const INTERVAL_MS: Record<ModelKind, number> = { image: 4000, video: 8000 };

type Polling = {
  job: JobView | null;
  error: unknown;
  polling: boolean;
  /** A job is known and not finished: polling now, or stopped by lost connection. */
  waiting: boolean;
  /** Start polling a job. Without `kind`, the interval follows the job's model once it is known. */
  start: (jobId: string, kind?: ModelKind) => void;
  /** Poll again the job last started (after a lost connection). */
  checkAgain: () => void;
  clear: () => void;
};

/**
 * Polls one job at a time and keeps the latest state. Polling stops when the
 * component unmounts. `kindOf` turns a model key into its kind.
 */
export function useJobPolling(kindOf: (modelKey: string) => ModelKind): Polling {
  const [job, setJob] = useState<JobView | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [polling, setPolling] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const startedRef = useRef<{ jobId: string; kind?: ModelKind } | null>(null);
  const kindOfRef = useRef(kindOf);
  useEffect(() => {
    kindOfRef.current = kindOf;
  });

  const stop = useCallback(() => controllerRef.current?.abort(), []);
  useEffect(() => stop, [stop]);

  const run = useCallback(async (jobId: string, kind: ModelKind | undefined, signal: AbortSignal) => {
    try {
      await pollJob(jobId, {
        get: api.get,
        intervalMs: INTERVAL_MS[kind ?? "video"],
        intervalFor: kind ? undefined : (first) => INTERVAL_MS[kindOfRef.current(first.model)],
        signal,
        onUpdate: setJob,
      });
    } catch (err) {
      if (signal.aborted) return;
      setError(err);
    }
    if (signal.aborted) return;
    setPolling(false);
    notifyCreditsChanged();
  }, []);

  const start = useCallback(
    (id: string, kind?: ModelKind) => {
      stop();
      const controller = new AbortController();
      controllerRef.current = controller;
      startedRef.current = { jobId: id, kind };
      setJobId(id);
      setError(null);
      setPolling(true);
      void run(id, kind, controller.signal);
    },
    [run, stop],
  );

  const checkAgain = useCallback(() => {
    const started = startedRef.current;
    if (started) start(started.jobId, started.kind);
  }, [start]);

  const clear = useCallback(() => {
    stop();
    startedRef.current = null;
    setJobId(null);
    setJob(null);
    setError(null);
    setPolling(false);
  }, [stop]);

  const finished = job?.status === "completed" || job?.status === "failed";
  const waiting = jobId !== null && !finished && (polling || error instanceof PollLostError);

  return { job, error, polling, waiting, start, checkAgain, clear };
}
