"use client";

import { ArrowDownToLine, Check, ImagePlus } from "lucide-react";
import { relativeTime } from "@/lib/relativeTime";
import { formatMegapixels, formatScale, formatSize, megapixels } from "@/lib/image-upscaler/models";
import type { ImageSize, UpscaleResult } from "@/lib/image-upscaler/types";
import { ActionTiles, type ActionTile } from "@/ui/ActionTiles";
import { Button } from "@/ui/Button";
import styles from "./main.module.css";

const FORMATS: Record<string, string> = { "image/png": "PNG", "image/jpeg": "JPG", "image/webp": "WebP" };

type UpscaleResultCardProps = {
  result: UpscaleResult;
  /** The input's size. */
  before: ImageSize;
  /** The result's size, read from the image once it loads; the expected size until then. */
  after: ImageSize | null;
  /** The settings no longer match the result: say so, softly. */
  stale: boolean;
  nextSteps: readonly ActionTile[];
  onNextStep: (id: string) => void;
  onDownload: () => void;
  /** Picks the next image to upscale. */
  onNewImage: () => void;
};

/** What the upscale achieved, and what to do with it. */
export function UpscaleResultCard({
  result,
  before,
  after,
  stale,
  nextSteps,
  onNextStep,
  onDownload,
  onNewImage,
}: UpscaleResultCardProps) {
  const scale = after ? after.width / before.width : null;
  const pixelGain = after ? megapixels(after) / megapixels(before) : null;
  const format = FORMATS[result.mimeType] ?? "image";
  const preset = typeof result.values.model === "string" ? result.values.model : null;

  return (
    <section className={styles.resultCard} aria-labelledby="upscale-result-title">
      <header className={styles.resultHeader}>
        <span className={styles.resultCheck} aria-hidden="true">
          <Check size={14} strokeWidth={2.5} />
        </span>
        <div>
          <h3 id="upscale-result-title">{scale ? `Upscaled ${formatScale(scale)}` : "Upscaled"}</h3>
          <p>
            {result.modelName}
            {preset && ` · ${preset}`} ·{" "}
            <time dateTime={result.createdAt} title={new Date(result.createdAt).toLocaleString()}>
              {relativeTime(result.createdAt)}
            </time>
          </p>
        </div>
      </header>

      <dl className={styles.sizeCompare}>
        <div>
          <dt>Before</dt>
          <dd>{formatSize(before)}</dd>
          <dd className={styles.sizeMeta}>{formatMegapixels(before)}</dd>
        </div>
        <div className={styles.sizeAfter}>
          <dt>After</dt>
          <dd>{after ? formatSize(after) : "—"}</dd>
          <dd className={styles.sizeMeta}>{after ? formatMegapixels(after) : "Reading size…"}</dd>
        </div>
      </dl>
      {pixelGain && pixelGain > 1.05 && (
        <p className={styles.pixelGain}>
          <strong>{Math.round(pixelGain)}×</strong> the pixels · {result.creditCost}{" "}
          {result.creditCost === 1 ? "credit" : "credits"}
        </p>
      )}

      <Button fullWidth size="lg" onClick={onDownload} className={styles.downloadResult}>
        <ArrowDownToLine size={17} aria-hidden="true" />
        Download {format}
      </Button>
      {stale && (
        <p className={styles.staleNote}>Your settings changed since this result. Upscale again to apply them.</p>
      )}

      <ActionTiles title="Continue with" tiles={nextSteps} onSelect={onNextStep} />

      {/* The whole page takes a dropped or pasted image too; this makes the next one obvious. */}
      <button type="button" className={styles.nextImage} onClick={onNewImage}>
        <span className={styles.nextImageIcon} aria-hidden="true">
          <ImagePlus size={18} />
        </span>
        <span>
          <strong>Upscale another image</strong>
          <small>Drop, paste or browse · JPG, PNG, WebP</small>
        </span>
      </button>
    </section>
  );
}
