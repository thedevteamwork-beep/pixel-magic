"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Steps through `count` items every `intervalMs`, for slideshows and chapter tabs.
 *
 * - `go(i)` jumps to an item and starts its full interval again.
 * - `hold()` / `release()` pause while the user is reading or pointing at it.
 * - `runKey` changes whenever an interval starts, so a progress bar keyed by it restarts in step.
 */
export function useAutoAdvance(count: number, intervalMs: number, enabled = true) {
  const [index, setIndex] = useState(0);
  const [run, setRun] = useState(0);
  const [held, setHeld] = useState(false);
  const current = count > 0 ? index % count : 0;
  const running = enabled && !held && count > 1;

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => {
      setIndex((value) => (value + 1) % count);
      setRun((value) => value + 1);
    }, intervalMs);
    return () => window.clearTimeout(timer);
  }, [running, count, intervalMs, run]);

  const go = useCallback((next: number) => {
    setIndex(next);
    setRun((value) => value + 1);
  }, []);
  const hold = useCallback(() => setHeld(true), []);
  const release = useCallback(() => {
    setHeld(false);
    setRun((value) => value + 1);
  }, []);

  return { index: current, go, hold, release, running, runKey: `${current}:${run}` };
}
