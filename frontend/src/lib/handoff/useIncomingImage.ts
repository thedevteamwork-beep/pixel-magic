"use client";

import { useEffect, useRef } from "react";
import { clearImage, imageFile, peekImage, type HandoffTarget, type ImageHandoff } from "./image";

/**
 * On arrival, takes the image another studio sent to `target` and hands it
 * over as a file. Each image is delivered once; `onError` hears when it
 * couldn't be fetched (an expired link, say).
 */
export function useIncomingImage(
  target: HandoffTarget,
  onImage: (file: File, handoff: ImageHandoff) => void,
  onError?: () => void,
) {
  const callbacks = useRef({ onImage, onError });
  useEffect(() => {
    callbacks.current = { onImage, onError };
  });

  useEffect(() => {
    const handoff = peekImage(target);
    if (!handoff) return;
    const controller = new AbortController();
    imageFile(handoff, controller.signal)
      .then((file) => {
        // Cleared only once delivered, so a remount (development's double effects) still finds it.
        clearImage();
        callbacks.current.onImage(file, handoff);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        clearImage();
        callbacks.current.onError?.();
      });
    return () => controller.abort();
  }, [target]);
}
