"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import type { PublicModel } from "@/lib/api/types";
import { toStudioModel } from "@/lib/image-generator/models";
import type { StudioModel } from "@/types/image-generator";
import { modelPresentation } from "./constants";

// One request per page load, shared by every caller; a failure is not cached.
let cached: Promise<StudioModel[]> | null = null;

function loadImageModels(): Promise<StudioModel[]> {
  cached ??= api
    .get<PublicModel[]>("/v1/models")
    .then((models) =>
      models
        .filter((model) => model.kind === "image")
        .map((model) => toStudioModel(model, modelPresentation[model.key])),
    )
    .catch((error: unknown) => {
      cached = null;
      throw error;
    });
  return cached;
}

/** The backend's image models, as studio models. `models` is `null` while loading. */
export function useImageModels(): { models: StudioModel[] | null; error: unknown; retry: () => void } {
  const [models, setModels] = useState<StudioModel[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    loadImageModels().then(
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
