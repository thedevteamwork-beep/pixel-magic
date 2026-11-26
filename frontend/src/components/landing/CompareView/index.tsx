"use client";

import { ChevronsLeftRight } from "lucide-react";
import { useCompareSweep } from "@/lib/landing/useCompareSweep";
import type { MediaId } from "@/types/landing";
import { LandingMedia } from "../LandingMedia";
import { useLandingMotion } from "../LandingProvider";
import styles from "./main.module.css";

type CompareViewProps = {
  before: MediaId;
  after: MediaId;
  /** Blur the "before" side, for an upscale shown with the same file on both sides. */
  softenBefore?: boolean;
  objectPosition?: string;
  sizes: string;
  /** `peek`: just the line, for a small card. `full`: a handle, side labels and a hint. */
  variant?: "peek" | "full";
  beforeLabel?: string;
  afterLabel?: string;
  hint?: string;
  /** Describes the comparison for screen readers. */
  label?: string;
};

/**
 * A before/after picture. The divider follows the pointer, and sweeps slowly on its own while the pointer is away.
 * Fills its positioned parent.
 */
export function CompareView({
  before,
  after,
  softenBefore = false,
  objectPosition,
  sizes,
  variant = "peek",
  beforeLabel,
  afterLabel,
  hint,
  label,
}: CompareViewProps) {
  const { motionEnabled } = useLandingMotion();
  const ref = useCompareSweep<HTMLSpanElement>({
    enabled: motionEnabled,
    period: variant === "full" ? 1700 : 1400,
    amplitude: variant === "full" ? 30 : 28,
  });

  return (
    <span
      ref={ref}
      className={styles.compare}
      data-variant={variant}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <LandingMedia asset={after} alt="" objectPosition={objectPosition} sizes={sizes} />
      <LandingMedia
        asset={before}
        alt=""
        objectPosition={objectPosition}
        sizes={sizes}
        className={`${styles.before} ${softenBefore ? styles.soft : ""}`}
      />
      <span className={styles.line} aria-hidden="true">
        {variant === "full" && (
          <span className={styles.knob}>
            <ChevronsLeftRight size={18} />
          </span>
        )}
      </span>
      {variant === "full" && (
        <>
          {beforeLabel && <span className={`${styles.label} ${styles.beforeLabel}`}>{beforeLabel}</span>}
          {afterLabel && <span className={`${styles.label} ${styles.afterLabel}`}>{afterLabel}</span>}
          {hint && <span className={styles.hint}>{hint}</span>}
        </>
      )}
    </span>
  );
}
