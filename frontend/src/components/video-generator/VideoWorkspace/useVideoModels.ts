"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchModels } from "@/lib/api/models";
import { toVideoModel } from "@/lib/video-generator/models";
import type { VideoModel } from "@/types/video-generator";
import { videoModelPresentation } from "../constants";

/** The backend's video models, featured first. `models` is `null` while loading. */
export function useVideoModels(): { models: VideoModel[] | null; error: unknown; retry: () => void } {
  const [models, setModels] = useState<VideoModel[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    const order = Object.keys(videoModelPresentation);
    const rank = (key: string) => (order.includes(key) ? order.indexOf(key) : order.length);
    fetchModels()
      .then((list) =>
        list
          .filter((model) => model.kind === "video")
          .sort((a, b) => rank(a.key) - rank(b.key))
          .map((model) => toVideoModel(model, videoModelPresentation[model.key])),
      )
      .then(
        (list) => current && (setModels(list), setError(null)),
        (failure: unknown) => current && setError(failure),
      );
    return () => {
      current = false;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setError(null);
    setAttempt((value) => value + 1);
  }, []);
  return { models, error, retry };
}
