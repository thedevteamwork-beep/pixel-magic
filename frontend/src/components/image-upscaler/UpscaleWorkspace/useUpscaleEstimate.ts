"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { jobValues } from "@/lib/image-upscaler/models";
import type { ImageSize, UpscaleModel, UpscaleValues } from "@/lib/image-upscaler/types";

const DEBOUNCE_MS = 250;
/** An estimate counts upload ids, never looks them up; any id stands for "one image". */
const PLACEHOLDER_UPLOAD = "00000000-0000-4000-8000-000000000000";

/**
 * The credits an upscale with these settings costs, from the backend's own
 * pricing: upscalers are priced by the result's size, so the image's size is
 * sent. `null` while it loads, or without an image.
 */
export function useUpscaleEstimate(
  model: UpscaleModel | undefined,
  values: UpscaleValues,
  size: ImageSize | null,
): number | null {
  const body =
    model && size ? { input: { ...jobValues(model, values), image: [PLACEHOLDER_UPLOAD] }, imageSize: size } : null;
  const key = model && body ? `${model.key}:${JSON.stringify(body)}` : "";
  const [estimate, setEstimate] = useState<{ key: string; credits: number } | null>(null);

  useEffect(() => {
    if (!key || !model) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const { plugin, operation } = model.source;
      api
        .post<{ creditsPerJob: number }>(
          "/v1/credits/estimate",
          { plugin, operation, ...JSON.parse(key.slice(model.key.length + 1)) },
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
