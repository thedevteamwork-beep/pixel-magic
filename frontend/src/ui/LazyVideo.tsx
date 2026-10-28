"use client";

import { useEffect, useRef, useState } from "react";

type LazyVideoProps = {
  src: string;
  poster?: string;
  label: string;
  className?: string;
};

/**
 * Muted looping video that only downloads once it's near the viewport,
 * and pauses while off-screen. Doesn't autoplay for reduced-motion users.
 */
export function LazyVideo({ src, poster, label, className }: LazyVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting) setLoaded(true);
      },
      { rootMargin: "200px" },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = ref.current;
    if (!video || !loaded) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (inView && !reducedMotion) {
      video.play().catch(() => {
        // Autoplay can be refused (e.g. low-power mode); the poster stays visible.
      });
    } else {
      video.pause();
    }
  }, [inView, loaded]);

  return (
    <video
      ref={ref}
      src={loaded ? src : undefined}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      aria-label={label}
      className={className}
    />
  );
}
