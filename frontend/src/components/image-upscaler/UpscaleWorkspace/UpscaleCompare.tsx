"use client";

import { Media } from "@/ui/Media";
import { ChevronsLeftRight } from "lucide-react";
import { useId, useState, type CSSProperties, type PointerEvent } from "react";
import styles from "./main.module.css";

export type UpscaleCompareProps = {
  originalUrl: string;
  resultUrl: string;
  width: number;
  height: number;
  originalLabel?: string;
  resultLabel?: string;
};

type CompareView = "compare" | "original" | "upscaled";

/** Both files share the source image's contained bounds; neither is filtered. */
export function UpscaleCompare({
  originalUrl,
  resultUrl,
  width,
  height,
  originalLabel = "Original",
  resultLabel = "Upscaled preview",
}: UpscaleCompareProps) {
  const [position, setPosition] = useState(50);
  const [view, setView] = useState<CompareView>("compare");
  const hintId = useId();
  const ratio = Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0 ? width / height : 1;
  const originalPercent = view === "original" ? 100 : view === "upscaled" ? 0 : position;
  const boundsStyle = { "--source-ratio": ratio } as CSSProperties;

  function updatePointer(event: PointerEvent<HTMLInputElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!bounds.width) return;
    setPosition(Math.round(Math.min(100, Math.max(0, ((event.clientX - bounds.left) / bounds.width) * 100))));
  }

  function startDrag(event: PointerEvent<HTMLInputElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    updatePointer(event);
  }

  function endDrag(event: PointerEvent<HTMLInputElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function showCompare() {
    setView("compare");
    if (position === 0 || position === 100) setPosition(50);
  }

  return (
    <div className={styles.comparison} role="group" aria-label="Original and upscaled image comparison">
      <div className={styles.viewport}>
        <div className={styles.labels} aria-hidden="true">
          {view !== "upscaled" && <span>{originalLabel}</span>}
          {view !== "original" && <span className={styles.resultLabel}>{resultLabel}</span>}
        </div>
        <div className={styles.imageBounds} style={boundsStyle}>
          <div
            className={styles.imageLayer}
            style={{ clipPath: `inset(0 0 0 ${originalPercent}%)` }}
            aria-hidden={view === "original"}
          >
            <Media
              media={{ kind: "image", src: resultUrl, alt: resultLabel }}
              fill
              plain
              className={styles.image}
              imageProps={{ unoptimized: true, className: styles.image }}
            />
          </div>
          <div
            className={styles.imageLayer}
            style={{ clipPath: `inset(0 ${100 - originalPercent}% 0 0)` }}
            aria-hidden={view === "upscaled"}
          >
            <Media
              media={{ kind: "image", src: originalUrl, alt: originalLabel }}
              fill
              plain
              className={styles.image}
              imageProps={{ unoptimized: true, className: styles.image }}
            />
          </div>
          {view === "compare" && (
            <>
              <input
                className={styles.range}
                type="range"
                min={0}
                max={100}
                step={1}
                value={position}
                onChange={(event) => setPosition(Number(event.target.value))}
                onPointerDown={startDrag}
                onPointerMove={(event) => {
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) updatePointer(event);
                }}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                aria-label="Compare original and upscaled image"
                aria-describedby={hintId}
                aria-valuetext={`${position}% original, ${100 - position}% upscaled`}
              />
              <span className={styles.divider} style={{ left: `${position}%` }} aria-hidden="true">
                <span className={styles.handle}>
                  <ChevronsLeftRight size={18} strokeWidth={1.8} />
                </span>
              </span>
            </>
          )}
        </div>
      </div>
      <div className={styles.controls}>
        <div className={styles.viewOptions} role="group" aria-label="Comparison view">
          <button type="button" aria-pressed={view === "compare"} onClick={showCompare}>
            Compare
          </button>
          <button type="button" aria-pressed={view === "original"} onClick={() => setView("original")}>
            Original
          </button>
          <button type="button" aria-pressed={view === "upscaled"} onClick={() => setView("upscaled")}>
            Upscaled
          </button>
        </div>
        <span className={styles.hint} id={hintId}>
          Drag or use arrow keys to compare.
        </span>
      </div>
    </div>
  );
}
