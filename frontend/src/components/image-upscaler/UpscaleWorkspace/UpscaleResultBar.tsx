import { ArrowDownToLine, Check } from "lucide-react";
import { formatMegapixels, formatScale, formatSize, megapixels } from "@/lib/image-upscaler/models";
import type { ImageSize, UpscaleResult } from "@/lib/image-upscaler/types";
import type { ActionTile } from "@/ui/ActionTiles";
import { Button } from "@/ui/Button";
import { Icon } from "@/ui/Icon";
import styles from "./main.module.css";

const FORMATS: Record<string, string> = { "image/png": "PNG", "image/jpeg": "JPG", "image/webp": "WebP" };

type UpscaleResultBarProps = {
  result: UpscaleResult;
  before: ImageSize;
  /** The result's size, read from the image once it loads; the expected size until then. */
  after: ImageSize | null;
  nextSteps: readonly ActionTile[];
  onNextStep: (id: string) => void;
  onDownload: () => void;
};

/** What the upscale achieved and what to do with it, above the comparison. */
export function UpscaleResultBar({ result, before, after, nextSteps, onNextStep, onDownload }: UpscaleResultBarProps) {
  const scale = after ? after.width / before.width : null;
  const gain = after ? Math.round(megapixels(after) / megapixels(before)) : null;
  const preset = typeof result.values.model === "string" ? result.values.model : null;

  return (
    <div className={styles.resultBar}>
      <span className={styles.resultCheck} aria-hidden="true">
        <Check size={13} strokeWidth={2.6} />
      </span>
      <div className={styles.resultText}>
        <strong>{scale ? `Upscaled ${formatScale(scale)}` : "Upscaled"}</strong>
        <span>
          {formatSize(before)} → <b>{after ? formatSize(after) : "…"}</b>
          {after && ` · ${formatMegapixels(after)}`}
          {gain && gain > 1 ? ` · ${gain}× the pixels` : ""} · {result.modelName}
          {preset && ` ${preset}`} · {result.creditCost} {result.creditCost === 1 ? "credit" : "credits"}
        </span>
      </div>
      <div className={styles.resultActions}>
        {nextSteps.map((step) => (
          <Button
            key={step.id}
            variant="ghost"
            size="sm"
            onClick={() => onNextStep(step.id)}
            title={step.description}
            className={styles.resultStep}
          >
            <Icon name={step.icon} className="size-4 text-primary" />
            {step.label}
          </Button>
        ))}
        <Button size="sm" onClick={onDownload}>
          <ArrowDownToLine size={15} aria-hidden="true" />
          Download {FORMATS[result.mimeType] ?? ""}
        </Button>
      </div>
    </div>
  );
}
