"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchModels } from "@/lib/api/models";
import { toStudioModel } from "@/lib/image-generator/models";
import type { StudioModel } from "@/types/image-generator";
import { modelPresentation } from "./constants";

function loadImageModels(): Promise<StudioModel[]> {
  return fetchModels().then((models) =>
    models.filter((model) => model.kind === "image").map((model) => toStudioModel(model, modelPresentation[model.key])),
  );
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
