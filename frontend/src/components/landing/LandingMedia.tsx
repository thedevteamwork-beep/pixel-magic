"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { landingAssets } from "@/constants/landing-media";
import type { MediaId } from "@/types/landing";
import { useLandingMotion } from "./LandingProvider";
import styles from "./LandingMedia.module.css";

type VisibilityCallback = (visible: boolean) => void;
const visibilityCallbacks = new WeakMap<Element, VisibilityCallback>();
let visibilityObserver: IntersectionObserver | undefined;
function observeVisibility(element: Element, callback: VisibilityCallback) {
  visibilityObserver ??= new IntersectionObserver((entries) => {
    for (const entry of entries) visibilityCallbacks.get(entry.target)?.(entry.isIntersecting);
  }, { rootMargin: "0px", threshold: 0.01 });
  visibilityCallbacks.set(element, callback);
  visibilityObserver.observe(element);
  return () => { visibilityObserver?.unobserve(element); visibilityCallbacks.delete(element); };
}

type LandingMediaProps = {
  asset: MediaId; alt?: string; behavior?: "ambient" | "hover" | "still";
  active?: boolean; priority?: boolean; className?: string; sizes?: string; filter?: string;
};

export function LandingMedia({ asset, alt, behavior = "still", active = false, priority = false, className = "", sizes = "(max-width: 600px) 50vw, 25vw", filter }: LandingMediaProps) {
  const media = landingAssets[asset];
  const { motionEnabled } = useLandingMotion();
  const containerRef = useRef<HTMLSpanElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [playing, setPlaying] = useState(false);
  const shouldPlay = !!media.video && motionEnabled && visible && (behavior === "ambient" || (behavior === "hover" && active));

  useEffect(() => {
    const element = containerRef.current;
    if (!element || !media.video || behavior === "still") return;
    return observeVisibility(element, setVisible);
  }, [media.video, behavior]);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (shouldPlay) void video.play().catch(() => {});
    else video.pause();
  }, [shouldPlay, asset]);

  return <span ref={containerRef} className={`${styles.media} ${className}`} style={filter ? { filter } : undefined}>
    <Image src={media.image} alt={alt ?? media.alt} fill sizes={sizes}
      loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : undefined} className={styles.image} />
    {media.video && behavior !== "still" && (shouldPlay || playing) && <video key={asset} ref={videoRef} src={media.video} muted loop playsInline preload="none" aria-hidden="true" tabIndex={-1}
      className={`${styles.video} ${shouldPlay && playing ? styles.visible : ""}`} onPlaying={() => setPlaying(true)} onError={() => setPlaying(false)} />}
  </span>;
}
