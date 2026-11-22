"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { estimateBody } from "@/lib/video-generator/models";
import type { VideoInputs, VideoModel, VideoSettings } from "@/types/video-generator";

const DEBOUNCE_MS = 250;

/**
 * The credits one video with these settings and inputs costs, from the
 * backend's own pricing (what the job will reserve): the inputs count (an end
 * frame, references) and motion control is priced on its clip's length.
 * `null` while the price for the current settings loads, or if it couldn't.
 */
export function useVideoEstimate(model: VideoModel, settings: VideoSettings, inputs: VideoInputs): number | null {
  const key = JSON.stringify(estimateBody(model, settings, inputs));
  const [estimate, setEstimate] = useState<{ key: string; credits: number } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api
        .post<{ creditsPerJob: number }>("/v1/credits/estimate", JSON.parse(key), { signal: controller.signal })
        .then((result) => setEstimate({ key, credits: result.creditsPerJob }))
        // A failed estimate only hides the price; creating the job prices it again.
        .catch(() => undefined);
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key]);

  return estimate?.key === key ? estimate.credits : null;
}
