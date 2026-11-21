"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { estimateInput } from "@/lib/video-generator/models";
import type { VideoModel, VideoSettings } from "@/types/video-generator";

const DEBOUNCE_MS = 250;

/**
 * The credits one video with these settings costs, from the backend's own
 * pricing (what the job will reserve). `null` while the price for the current
 * settings loads, or if it couldn't.
 */
export function useVideoEstimate(model: VideoModel, settings: VideoSettings): number | null {
  const input = estimateInput(model, settings);
  const key = `${model.id}:${JSON.stringify(input)}`;
  const [estimate, setEstimate] = useState<{ key: string; credits: number } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const { plugin, operation } = model.source;
      api
        .post<{ creditsPerJob: number }>(
          `/v1/credits/estimate/${encodeURIComponent(plugin)}/${encodeURIComponent(operation)}`,
          { input: JSON.parse(key.slice(model.id.length + 1)) },
          { signal: controller.signal },
        )
        .then((result) => setEstimate({ key, credits: result.creditsPerJob }))
        // A failed estimate only hides the price; creating the job prices it again.
        .catch(() => undefined);
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key, model]);

  return estimate?.key === key ? estimate.credits : null;
}
