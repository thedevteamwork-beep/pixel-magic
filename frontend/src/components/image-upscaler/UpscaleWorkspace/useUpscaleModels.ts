"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchModels } from "@/lib/api/models";
import { toUpscaleModel } from "@/lib/image-upscaler/models";
import type { UpscaleModel } from "@/lib/image-upscaler/types";
import { upscalePresentation } from "../constants";

/** The backend's upscale models. `models` is `null` while loading. */
export function useUpscaleModels(): { models: UpscaleModel[] | null; error: unknown; retry: () => void } {
  const [models, setModels] = useState<UpscaleModel[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    fetchModels()
      .then((list) =>
        list
          .filter((model) => model.kind === "upscale")
          .map((model) => toUpscaleModel(model, upscalePresentation[model.key])),
      )
      .then(
        (list) => current && (setModels(list), setError(null)),
        (failure: unknown) => current && setError(failure),
      );
    return () => {
      current = false;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  return { models, error, retry };
}
