import type { CSSProperties } from "react";
import type { MediaId } from "@/types/landing";
import { LandingMedia } from "../LandingMedia";
import styles from "./main.module.css";

const COLUMNS = 7;
const PER_COLUMN = 4;

/** A tilted wall of pictures whose columns drift up and down at slightly different speeds. */
export function Mosaic({ assets }: { assets: readonly MediaId[] }) {
  return (
    <div className={styles.mosaic} aria-hidden="true">
      {Array.from({ length: COLUMNS }, (_, column) => {
        const set = Array.from({ length: PER_COLUMN }, (_, row) => assets[(column * 3 + row) % assets.length]);
        return (
          <div
            className={styles.column}
            key={column}
            style={{ "--drift-duration": `${44 + column * 6}s` } as CSSProperties}
          >
            {/* Two copies, so the drift loops without a seam. */}
            {[...set, ...set].map((asset, index) => (
              <span className={styles.tile} key={`${asset}-${index}`}>
                <LandingMedia asset={asset} alt="" sizes="14vw" />
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}
