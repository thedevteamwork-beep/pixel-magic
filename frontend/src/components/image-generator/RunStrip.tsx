import { CircleAlert, LoaderCircle, X } from "lucide-react";
import type { ImageResult, ImageRun } from "@/types/image-generator";
import { Media } from "@/ui/Media";
import { REMOTE_IMAGE } from "./constants";
import styles from "./main.module.css";

function statusOf(run: ImageRun, onCanvas: boolean): string {
  if (run.status === "running") return run.count > 1 ? `Creating ${run.count} images` : "Creating";
  if (run.status === "failed") return "Didn’t work · Retry";
  return onCanvas ? "On canvas" : "Ready · View";
}

/**
 * The generations that still matter, under the canvas: ones being made,
 * finished ones not yet seen, and failed ones. Choosing a card shows it on the
 * canvas. Only shown when there is more than one, so making one image at a
 * time looks as it always has.
 */
export function RunStrip({
  runs,
  viewingId,
  items,
  onView,
  onDismiss,
}: {
  runs: readonly ImageRun[];
  viewingId: string | null;
  /** Results, for a finished run's thumbnail. */
  items: readonly ImageResult[];
  onView: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  return (
    <ul className={styles.runStrip} aria-label="Your generations">
      {runs.map((run) => {
        const onCanvas = run.id === viewingId;
        const thumb = run.status === "done" ? items.find((item) => item.jobId === run.jobId) : undefined;
        const fresh = run.status === "done" && !run.seen && !onCanvas;
        return (
          <li key={run.id} className={styles.runCard} data-status={run.status} aria-current={onCanvas || undefined}>
            <button type="button" className={styles.runOpen} onClick={() => onView(run.id)}>
              <span className={styles.runThumb} aria-hidden="true">
                {thumb ? (
                  <Media
                    media={{ kind: "image", src: thumb.url, alt: "" }}
                    fill
                    sizes="44px"
                    className={styles.coverImage}
                    imageProps={REMOTE_IMAGE}
                  />
                ) : run.status === "failed" ? (
                  <CircleAlert size={17} />
                ) : (
                  <LoaderCircle size={17} className={styles.spinner} />
                )}
              </span>
              <span className={styles.runCopy}>
                <strong>{run.prompt || "Untitled"}</strong>
                <small>{statusOf(run, onCanvas)}</small>
              </span>
              {fresh && <span className={styles.runNew} aria-label="New" />}
            </button>
            {run.status === "failed" && (
              <button
                type="button"
                className={styles.runDismiss}
                onClick={() => onDismiss(run.id)}
                aria-label={`Dismiss: ${run.prompt}`}
              >
                <X size={12} aria-hidden="true" />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
