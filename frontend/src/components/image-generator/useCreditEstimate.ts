"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { estimateInput } from "@/lib/image-generator/models";
import type { ImageOptionValue, StudioModel } from "@/types/image-generator";

const DEBOUNCE_MS = 250;

/**
 * The credits one job with these settings costs, from the same pricing the
 * backend reserves with. `null` while the price for the current settings loads.
 */
export function useCreditEstimate(
  model: StudioModel | undefined,
  options: Record<string, ImageOptionValue>,
  referenceCount: number,
): number | null {
  const input = model ? estimateInput(model, options, referenceCount) : null;
  // A stable key for "these settings": the effect reruns only when the price could change.
  const key = model && input ? `${model.key}:${JSON.stringify(input)}` : "";
  const [estimate, setEstimate] = useState<{ key: string; credits: number } | null>(null);

  useEffect(() => {
    if (!key || !model) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const { plugin, operation } = model.source;
      api
        .post<{ creditsPerJob: number }>(
          "/v1/credits/estimate",
          // The key ends with the input's JSON, so the body always matches the key.
          { plugin, operation, input: JSON.parse(key.slice(model.key.length + 1)) },
          { signal: controller.signal },
        )
        .then((result) => setEstimate({ key, credits: result.creditsPerJob }))
        // A failed estimate only hides the price; creating the job still checks it.
        .catch(() => undefined);
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key, model]);

  return estimate?.key === key ? estimate.credits : null;
}
