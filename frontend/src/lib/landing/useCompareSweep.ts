"use client";

import { useEffect, useRef } from "react";

type SweepOptions = {
  /** Sweep on its own while the pointer is away. Pass `false` when motion is off. */
  enabled: boolean;
  /** How slowly the idle sweep moves; higher is slower. */
  period?: number;
  /** How far the idle sweep travels each side of the middle, in percent. */
  amplitude?: number;
};

const clamp = (value: number) => Math.min(100, Math.max(0, value));

/**
 * Drives a before/after divider through the `--pos` CSS variable (a percentage) on the returned element.
 * The divider follows the pointer, and sweeps slowly while the pointer is away and the element is on screen.
 * It writes the variable directly, so it never re-renders React on every frame.
 */
export function useCompareSweep<T extends HTMLElement>({ enabled, period = 1500, amplitude = 28 }: SweepOptions) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let pointerInside = false;
    let visible = false;
    let frame = 0;
    const place = (percent: number) => element.style.setProperty("--pos", `${percent}%`);

    const tick = (time: number) => {
      if (!pointerInside) place(50 + Math.sin(time / period) * amplitude);
      frame = requestAnimationFrame(tick);
    };
    const restart = () => {
      cancelAnimationFrame(frame);
      if (enabled && visible) frame = requestAnimationFrame(tick);
    };
    const follow = (event: PointerEvent) => {
      pointerInside = true;
      const bounds = element.getBoundingClientRect();
      if (bounds.width) place(clamp(((event.clientX - bounds.left) / bounds.width) * 100));
    };
    const leave = () => {
      pointerInside = false;
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      restart();
    });
    observer.observe(element);
    element.addEventListener("pointermove", follow);
    element.addEventListener("pointerleave", leave);
    if (!enabled) place(50);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      element.removeEventListener("pointermove", follow);
      element.removeEventListener("pointerleave", leave);
    };
  }, [enabled, period, amplitude]);

  return ref;
}
