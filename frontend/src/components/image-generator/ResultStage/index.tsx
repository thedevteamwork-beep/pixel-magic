"use client";

import { useEffect, useRef, useState } from "react";
import type { ImageResult, NextStep, NextStepOption, StudioModel } from "@/types/image-generator";
import { Media } from "@/ui/Media";
import { Modal } from "@/ui/Modal";
import { REMOTE_IMAGE } from "../constants";
import { ResultDetails } from "./ResultDetails";
import { ResultVariations } from "./ResultVariations";
import { ResultViewer } from "./ResultViewer";
import styles from "./main.module.css";

export type ResultStageProps = {
  active: ImageResult;
  /** Every image of the active image's generation, the active one included. */
  variations: readonly ImageResult[];
  models?: readonly StudioModel[];
  /** What the image can become next. */
  nextSteps: readonly NextStepOption[];
  onSelect: (id: string) => void;
  onFavorite: (id: string) => void;
  /** Generates the same prompt and settings again. */
  onRerun?: (item: ImageResult) => void;
  /** Loads the prompt and settings into the composer. */
  onReuse: (item: ImageResult) => void;
  onNextStep: (item: ImageResult, step: NextStep) => void;
  onDelete: (id: string) => void;
};

/** Typing keeps its arrow keys. */
function isEditable(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
  );
}

/**
 * The canvas after a generation: its image large, with what made it and
 * what to do next beside it. Older generations live in History.
 * ← and → step through the generation's images.
 */
export function ResultStage({
  active,
  variations,
  models,
  nextSteps,
  onSelect,
  onFavorite,
  onRerun,
  onReuse,
  onNextStep,
  onDelete,
}: ResultStageProps) {
  const [expanded, setExpanded] = useState(false);
  const index = Math.max(
    0,
    variations.findIndex((item) => item.id === active.id),
  );

  const stepRef = useRef<(delta: number) => void>(() => undefined);
  const expandedRef = useRef(expanded);
  useEffect(() => {
    expandedRef.current = expanded;
    stepRef.current = (delta) => {
      if (variations.length > 1) onSelect(variations[(index + delta + variations.length) % variations.length].id);
    };
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || isEditable(event.target)) return;
      // Other dialogs own their keys; the full-size view steps too.
      if (!expandedRef.current && event.target instanceof Element && event.target.closest("dialog")) return;
      event.preventDefault();
      stepRef.current(event.key === "ArrowRight" ? 1 : -1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={styles.stage}>
      <div className={styles.viewerColumn} data-variations={variations.length > 1}>
        <ResultViewer
          item={active}
          position={{ index, total: variations.length }}
          onPrevious={() => stepRef.current(-1)}
          onNext={() => stepRef.current(1)}
          onFavorite={() => onFavorite(active.id)}
          onExpand={() => setExpanded(true)}
        />
        {variations.length > 1 && <ResultVariations items={variations} activeId={active.id} onSelect={onSelect} />}
      </div>
      <ResultDetails
        item={active}
        model={models?.find((model) => model.key === active.model)}
        nextSteps={nextSteps}
        onRerun={onRerun && (() => onRerun(active))}
        onReuse={() => onReuse(active)}
        onNextStep={(step) => onNextStep(active, step)}
        onDelete={() => onDelete(active.id)}
      />

      <Modal
        open={expanded}
        onClose={() => setExpanded(false)}
        title={variations.length > 1 ? `${active.modelName} · ${index + 1} of ${variations.length}` : active.modelName}
        className={styles.lightbox}
      >
        <div className={styles.lightboxImage}>
          <Media
            media={{ kind: "image", src: active.url, alt: active.alt }}
            fill
            plain
            sizes="100vw"
            imageProps={{ ...REMOTE_IMAGE, className: "object-contain" }}
          />
        </div>
      </Modal>
    </div>
  );
}
