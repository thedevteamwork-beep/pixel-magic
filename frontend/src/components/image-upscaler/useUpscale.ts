"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadUpscaleFile, resizeUpscaleImage } from "@/lib/image-upscaler/browser";
import { requestUpscalePreview } from "@/lib/image-upscaler/client";
import { calculateUpscaleOutput } from "@/lib/image-upscaler/limits";
import type { LoadedUpscaleFile, UpscaleOutput, UpscaleSettings } from "@/lib/image-upscaler/types";

type UpscaleResult = { url: string; output: UpscaleOutput; settings: UpscaleSettings };
type UpscaleStage = "idle" | "loading" | "preparing" | "resizing";

/** All image URLs and pending work belong to this workspace, including on navigation. */
export function useUpscale() {
  const [source, setSource] = useState<LoadedUpscaleFile | null>(null);
  const [result, setResult] = useState<UpscaleResult | null>(null);
  const [stage, setStage] = useState<UpscaleStage>("idle");
  const [error, setError] = useState("");
  const sourceRef = useRef<LoadedUpscaleFile | null>(null);
  const resultRef = useRef<UpscaleResult | null>(null);
  const operationRef = useRef<AbortController | null>(null);

  useEffect(() => () => {
    operationRef.current?.abort();
    if (sourceRef.current) URL.revokeObjectURL(sourceRef.current.url);
    if (resultRef.current) URL.revokeObjectURL(resultRef.current.url);
  }, []);

  const begin = useCallback((nextStage: UpscaleStage) => {
    operationRef.current?.abort();
    const controller = new AbortController();
    operationRef.current = controller;
    setError("");
    setStage(nextStage);
    return controller;
  }, []);

  const acceptFile = useCallback(async (file: File, controller: AbortController) => {
    const loaded = await loadUpscaleFile(file, controller.signal);
    if (controller.signal.aborted) {
      URL.revokeObjectURL(loaded.url);
      return;
    }
    if (sourceRef.current) URL.revokeObjectURL(sourceRef.current.url);
    if (resultRef.current) URL.revokeObjectURL(resultRef.current.url);
    sourceRef.current = loaded;
    resultRef.current = null;
    setSource(loaded);
    setResult(null);
  }, []);

  const loadFile = useCallback(async (file: File) => {
    const controller = begin("loading");
    try {
      await acceptFile(file, controller);
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "This image couldn’t be opened. Try another file.");
    } finally {
      if (!controller.signal.aborted) setStage("idle");
    }
  }, [acceptFile, begin]);

  const upscale = useCallback(async (settings: UpscaleSettings) => {
    const image = sourceRef.current;
    if (!image) return;
    const controller = begin("preparing");
    try {
      const input = { width: image.width, height: image.height, contentType: image.file.type, size: image.file.size };
      // Check before the request as well as on the server; pixels stay in the browser.
      calculateUpscaleOutput(input, settings.upscale_factor, "png");
      const plan = await requestUpscalePreview({ source: input, ...settings }, controller.signal);
      if (controller.signal.aborted) return;
      setStage("resizing");
      const blob = await resizeUpscaleImage(image.url, plan.output, controller.signal);
      if (controller.signal.aborted) return;
      const next = { url: URL.createObjectURL(blob), output: plan.output, settings: plan.settings };
      if (resultRef.current) URL.revokeObjectURL(resultRef.current.url);
      resultRef.current = next;
      setResult(next);
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "The preview couldn’t be created. Please try again.");
    } finally {
      if (!controller.signal.aborted) setStage("idle");
    }
  }, [begin]);

  const cancel = useCallback(() => {
    operationRef.current?.abort();
    setStage("idle");
  }, []);

  const reset = useCallback(() => {
    operationRef.current?.abort();
    if (sourceRef.current) URL.revokeObjectURL(sourceRef.current.url);
    if (resultRef.current) URL.revokeObjectURL(resultRef.current.url);
    sourceRef.current = null;
    resultRef.current = null;
    setSource(null);
    setResult(null);
    setStage("idle");
    setError("");
  }, []);

  return { source, result, stage, error, setError, loadFile, upscale, cancel, reset };
}
