"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api/client";
import type { JobView, ModelKind } from "@/lib/api/types";
import { notifyCreditsChanged } from "@/lib/balance";
import { pollJob } from "@/lib/generate/pollJob";

const INTERVAL_MS: Record<ModelKind, number> = { image: 4000, video: 8000 };

type Polling = {
  job: JobView | null;
  error: unknown;
  polling: boolean;
  /** Start (or restart) polling. Without `kind`, the job is fetched once to learn its model. */
  start: (jobId: string, kind?: ModelKind) => void;
  clear: () => void;
};

/**
 * Polls one job at a time and keeps the latest state. Polling stops when the
 * component unmounts. `kindOf` turns a model key into its kind.
 */
export function useJobPolling(kindOf: (modelKey: string) => ModelKind): Polling {
  const [job, setJob] = useState<JobView | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [polling, setPolling] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const kindOfRef = useRef(kindOf);
  useEffect(() => {
    kindOfRef.current = kindOf;
  });

  const stop = useCallback(() => controllerRef.current?.abort(), []);
  useEffect(() => stop, [stop]);

  const run = useCallback(async (jobId: string, kind: ModelKind | undefined, signal: AbortSignal) => {
    try {
      let kindToUse = kind;
      if (!kindToUse) {
        const first = await api.get<JobView>(`/v1/jobs/${jobId}`, { signal });
        setJob(first);
        kindToUse = kindOfRef.current(first.model);
      }
      await pollJob(jobId, { get: api.get, intervalMs: INTERVAL_MS[kindToUse], signal, onUpdate: setJob });
    } catch (err) {
      if (signal.aborted) return;
      setError(err);
    }
    if (signal.aborted) return;
    setPolling(false);
    notifyCreditsChanged();
  }, []);

  const start = useCallback(
    (jobId: string, kind?: ModelKind) => {
      stop();
      const controller = new AbortController();
      controllerRef.current = controller;
      setError(null);
      setPolling(true);
      void run(jobId, kind, controller.signal);
    },
    [run, stop],
  );

  const clear = useCallback(() => {
    stop();
    setJob(null);
    setError(null);
    setPolling(false);
  }, [stop]);

  return { job, error, polling, start, clear };
}
