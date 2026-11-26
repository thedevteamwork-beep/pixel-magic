"use client";

import { Media } from "@/ui/Media";
import { useEffect, useRef, useState } from "react";
import { templateAsset } from "@/constants/landing-media";
import type { TemplateMediaId } from "@/types/landing";
import { useLandingMotion } from "../LandingProvider";
import styles from "./main.module.css";

type VisibilityCallback = (visible: boolean) => void;
const visibilityCallbacks = new WeakMap<Element, VisibilityCallback>();
let visibilityObserver: IntersectionObserver | undefined;
function observeVisibility(element: Element, callback: VisibilityCallback) {
  visibilityObserver ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) visibilityCallbacks.get(entry.target)?.(entry.isIntersecting);
    },
    { rootMargin: "0px", threshold: 0.01 },
  );
  visibilityCallbacks.set(element, callback);
  visibilityObserver.observe(element);
  return () => {
    visibilityObserver?.unobserve(element);
    visibilityCallbacks.delete(element);
  };
}

type LandingMediaProps = {
  asset: TemplateMediaId;
  alt?: string;
  behavior?: "ambient" | "hover" | "still";
  active?: boolean;
  priority?: boolean;
  className?: string;
  sizes?: string;
  filter?: string;
  /** Which part of the image stays in view when the box crops it; overrides the asset's own. */
  objectPosition?: string;
};

export function LandingMedia({
  asset,
  alt,
  behavior = "still",
  active = false,
  priority = false,
  className = "",
  sizes = "(max-width: 600px) 50vw, 25vw",
  filter,
  objectPosition,
}: LandingMediaProps) {
  const media = templateAsset(asset);
  const { motionEnabled } = useLandingMotion();
  const containerRef = useRef<HTMLSpanElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [readyAsset, setReadyAsset] = useState<TemplateMediaId>();
  const ready = readyAsset === asset;
  const position = objectPosition ?? media.objectPosition;
  const hasClip = !!media.video && behavior !== "still";
  const shouldPlay =
    hasClip && motionEnabled && visible && (behavior === "ambient" || (behavior === "hover" && active));

  useEffect(() => {
    const element = containerRef.current;
    if (!element || !hasClip) return;
    return observeVisibility(element, (isVisible) => {
      setVisible(isVisible);
      if (isVisible) setMounted(true);
    });
  }, [hasClip]);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (shouldPlay) void video.play().catch(() => {});
    else {
      video.pause();
      // Back to the first frame, so the card rests on the same picture each time.
      if (video.currentTime > 0.2) video.currentTime = 0.1;
    }
  }, [shouldPlay, asset, ready]);

  return (
    <span ref={containerRef} className={`${styles.media} ${className}`} style={filter ? { filter } : undefined}>
      {media.image && (
        <Media
          media={{ kind: "image", src: media.image, alt: alt ?? media.alt }}
          fill
          sizes={sizes}
          plain
          imageProps={{
            loading: priority ? "eager" : "lazy",
            fetchPriority: priority ? "high" : undefined,
            className: styles.image,
            style: position ? { objectPosition: position } : undefined,
          }}
        />
      )}
      {/* The clip loads once the card is near the screen. Its first frame replaces the still; hover plays it. */}
      {hasClip && mounted && (
        <video
          key={asset}
          ref={videoRef}
          src={`${media.video}#t=0.1`}
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          tabIndex={-1}
          className={`${styles.video} ${ready ? styles.visible : ""}`}
          style={position ? { objectPosition: position } : undefined}
          onLoadedData={() => setReadyAsset(asset)}
          onError={() => setReadyAsset(undefined)}
        />
      )}
    </span>
  );
}
