import type { AdFormat } from "@/types/landing";
import { LandingMedia } from "../LandingMedia";
import styles from "./main.module.css";

type FormatFanProps = {
  formats: readonly AdFormat[];
  /** Spread the stack out into its separate formats. */
  open: boolean;
};

/** One product photo stacked with the ad sizes made from it; the stack spreads apart when `open`. */
export function FormatFan({ formats, open }: FormatFanProps) {
  return (
    <div className={styles.fan} data-open={open} aria-hidden="true">
      {formats.map((format) => (
        <div className={styles.ad} data-shape={format.shape} key={format.id}>
          <LandingMedia asset={format.asset} alt="" objectPosition={format.objectPosition} sizes="300px" />
          <span className={styles.adLabel}>{format.label}</span>
        </div>
      ))}
    </div>
  );
}
