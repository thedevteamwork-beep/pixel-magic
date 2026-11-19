"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, newIdempotencyKey } from "@/lib/api/client";
import { notifyCreditsChanged } from "@/lib/balance";
import { pollJob } from "@/lib/generate/pollJob";
import { submitGeneration } from "@/lib/generate/submit";
import { uploadFile } from "@/lib/generate/uploadFile";
import { loadUpscaleFile } from "@/lib/image-upscaler/browser";
import { jobToUpscaleResult, jobValues } from "@/lib/image-upscaler/models";
import type { LoadedUpscaleFile, UpscaleModel, UpscaleResult, UpscaleValues } from "@/lib/image-upscaler/types";
import { SAMPLE_UPSCALE_MS, UPSCALE_POLL_INTERVAL_MS, UPSCALE_WAIT_LIMIT_MS } from "../constants";
import { sampleSourceFile, sampleUpscaleJob } from "../fixtures/sampleUpscale";

export type UpscaleStage = "idle" | "loading" | "uploading" | "upscaling";

/** The upscaler stopped waiting on a job that is still running. */
export class UpscaleStillRunningError extends Error {
  constructor() {
    super("The upscale is still running");
    this.name = "UpscaleStillRunningError";
  }
}

const abortError = () => new DOMException("Canceled", "AbortError");
const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => (clearTimeout(timer), reject(abortError())), { once: true });
  });

/**
 * The upscaler's image and job: the picked image (a local preview), its
 * upload, the job that upscales it and the result. With `sample`
 * (development only) it starts from a finished sample and only pretends to
 * upscale, so the UI can be worked on without the API.
 */
export function useUpscale(models: readonly UpscaleModel[] | null, sample = false) {
  const [source, setSource] = useState<LoadedUpscaleFile | null>(null);
  const [result, setResult] = useState<UpscaleResult | null>(null);
  const [stage, setStage] = useState<UpscaleStage>("idle");
  const [error, setError] = useState<unknown>(null);
  const sourceRef = useRef<LoadedUpscaleFile | null>(null);
  const operationRef = useRef<AbortController | null>(null);
  /** The current image's upload, reused by "Upscale again". */
  const uploadRef = useRef<{ sourceUrl: string; uploadId: string } | null>(null);
  const modelsRef = useRef(models);
  useEffect(() => {
    modelsRef.current = models;
  });

  useEffect(
    () => () => {
      operationRef.current?.abort();
      if (sourceRef.current) URL.revokeObjectURL(sourceRef.current.url);
    },
    [],
  );

  const begin = useCallback((next: UpscaleStage) => {
    operationRef.current?.abort();
    const controller = new AbortController();
    operationRef.current = controller;
    setError(null);
    setStage(next);
    return controller;
  }, []);

  const finish = useCallback((controller: AbortController) => {
    if (operationRef.current === controller) {
      operationRef.current = null;
      setStage("idle");
    }
  }, []);

  const replaceSource = useCallback((loaded: LoadedUpscaleFile | null) => {
    if (sourceRef.current) URL.revokeObjectURL(sourceRef.current.url);
    sourceRef.current = loaded;
    uploadRef.current = null;
    setSource(loaded);
    setResult(null);
  }, []);

  const loadFile = useCallback(
    async (file: File) => {
      const controller = begin("loading");
      try {
        const loaded = await loadUpscaleFile(file, controller.signal);
        if (controller.signal.aborted) {
          URL.revokeObjectURL(loaded.url);
          return;
        }
        replaceSource(loaded);
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause : new Error("This image couldn’t be opened. Try another file."));
      } finally {
        finish(controller);
      }
    },
    [begin, finish, replaceSource],
  );

  // Sample mode opens on a finished upscale.
  useEffect(() => {
    if (!sample || !models) return;
    let current = true;
    void sampleSourceFile()
      .then((file) => loadUpscaleFile(file))
      .then((loaded) => {
        if (!current) return URL.revokeObjectURL(loaded.url);
        replaceSource(loaded);
        setResult(jobToUpscaleResult(sampleUpscaleJob(), models, loaded));
      });
    return () => {
      current = false;
    };
  }, [sample, models, replaceSource]);

  /** Uploads the image (once per image), creates the job and waits for the result. Failures set `error`. */
  const upscale = useCallback(
    async (model: UpscaleModel, values: UpscaleValues) => {
      const image = sourceRef.current;
      if (!image) return;
      const size = { width: image.width, height: image.height };
      const controller = begin(sample ? "upscaling" : "uploading");
      try {
        if (sample) {
          await wait(SAMPLE_UPSCALE_MS, controller.signal);
          const job = sampleUpscaleJob(jobValues(model, values), model.key);
          setResult(jobToUpscaleResult(job, modelsRef.current ?? [], size));
          return;
        }
        const kept = uploadRef.current?.sourceUrl === image.url ? uploadRef.current.uploadId : undefined;
        const job = await submitGeneration({
          api,
          uploadFile,
          model: model.source,
          prompt: "",
          values: jobValues(model, values),
          files: [image.file],
          idempotencyKey: newIdempotencyKey(),
          uploadIds: [kept],
          onUploaded: (uploadId) => {
            uploadRef.current = { sourceUrl: image.url, uploadId };
          },
        });
        notifyCreditsChanged();
        setStage("upscaling");
        let outOfTime = false;
        const deadline = setTimeout(() => {
          outOfTime = true;
          controller.abort();
        }, UPSCALE_WAIT_LIMIT_MS);
        try {
          const done = await pollJob(job.jobId, {
            get: api.get,
            intervalMs: UPSCALE_POLL_INTERVAL_MS,
            signal: controller.signal,
          }).catch((cause: unknown) => {
            throw outOfTime ? new UpscaleStillRunningError() : cause;
          });
          if (sourceRef.current === image) setResult(jobToUpscaleResult(done, modelsRef.current ?? [], size));
        } finally {
          clearTimeout(deadline);
          // Completed jobs capture credits; failed ones return them.
          notifyCreditsChanged();
        }
      } catch (cause) {
        // Leaving or canceling only stops waiting; the job still finishes.
        if (cause instanceof Error && cause.name === "AbortError") return;
        setError(cause);
      } finally {
        finish(controller);
      }
    },
    [begin, finish, sample],
  );

  /** Stops loading or waiting. A job already running still finishes. */
  const cancel = useCallback(() => {
    operationRef.current?.abort();
    operationRef.current = null;
    setStage("idle");
  }, []);

  const reset = useCallback(() => {
    cancel();
    replaceSource(null);
    setError(null);
  }, [cancel, replaceSource]);

  return { source, result, stage, error, setError, loadFile, upscale, cancel, reset };
}
