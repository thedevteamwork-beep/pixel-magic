"use client";

import { RefreshCw, Trash2, Undo2 } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { resultGuidance, resultSpecs } from "@/lib/image-generator/details";
import { relativeTime } from "@/lib/relativeTime";
import type { ImageResult, NextStep, NextStepOption, StudioModel } from "@/types/image-generator";
import { Button } from "@/ui/Button";
import { CopyButton } from "@/ui/CopyButton";
import { ActionTiles } from "@/ui/ActionTiles";
import { IconButton } from "@/ui/IconButton";
import styles from "./main.module.css";

type ResultDetailsProps = {
  item: ImageResult;
  /** The model that made it, when it is still offered. */
  model?: StudioModel;
  nextSteps: readonly NextStepOption[];
  onRerun?: () => void;
  onReuse: () => void;
  onNextStep: (step: NextStep) => void;
  onDelete: () => void;
};

/** What made the image (model, prompt, settings) and where it can go next. */
export function ResultDetails({ item, model, nextSteps, onRerun, onReuse, onNextStep, onDelete }: ResultDetailsProps) {
  const guidance = resultGuidance(item);
  const specs = resultSpecs(item);
  return (
    <aside className={styles.details} aria-label="Image details">
      <header className={styles.detailsHeader}>
        <span className={styles.modelGlyph} aria-hidden="true">
          {model?.symbol ?? item.modelName.slice(0, 1)}
        </span>
        <div className={styles.modelText}>
          <strong>{item.modelName}</strong>
          <span>
            {model?.maker && `${model.maker} · `}
            <time dateTime={item.createdAt} title={new Date(item.createdAt).toLocaleString()}>
              {relativeTime(item.createdAt)}
            </time>
          </span>
        </div>
        <IconButton size="sm" label="Remove from history" className={styles.deleteAction} onClick={onDelete}>
          <Trash2 size={15} aria-hidden="true" />
        </IconButton>
      </header>

      <div className={styles.detailsBody}>
        <section className={styles.detailsSection} aria-labelledby={`${item.id}-prompt`}>
          <div className={styles.sectionHead}>
            <h3 id={`${item.id}-prompt`}>Prompt</h3>
            <div className={styles.sectionTools}>
              <button
                type="button"
                className={styles.textTool}
                onClick={onReuse}
                title="Load this prompt and its settings into the composer"
              >
                <Undo2 size={13} aria-hidden="true" />
                Reuse
              </button>
              <CopyButton text={item.prompt} label="Copy" />
            </div>
          </div>
          {/* Keyed so a new image starts collapsed. */}
          <PromptText key={item.id} text={item.prompt} />
        </section>

        <dl className={styles.specs} aria-label="Settings">
          {specs.map((spec) => (
            <div key={spec.label}>
              <dt>{spec.label}</dt>
              <dd>{spec.value}</dd>
            </div>
          ))}
          {guidance.length > 0 && (
            <div className={styles.direction}>
              <dt>Direction</dt>
              <dd>{guidance.join(" · ")}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className={styles.detailsActions}>
        {onRerun && (
          <Button fullWidth onClick={onRerun} className={styles.rerun}>
            <RefreshCw size={16} aria-hidden="true" />
            Generate again
            <span className={styles.rerunCost}>
              {item.creditCost} {item.creditCost === 1 ? "credit" : "credits"}
            </span>
          </Button>
        )}
        <ActionTiles title="Continue with" tiles={nextSteps} onSelect={onNextStep} />
      </div>
    </aside>
  );
}

/** The prompt, clamped to a few lines with "Show more" when it runs longer. */
function PromptText({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  // Only offer "Show more" when the clamp actually hides text at the panel's current width.
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || expanded) return;
    const measure = () => setOverflows(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [expanded, text]);

  return (
    <>
      <p ref={ref} className={`${styles.prompt} ${expanded ? "" : styles.promptClamped}`}>
        {text}
      </p>
      {(overflows || expanded) && (
        <button
          type="button"
          className={styles.textToggle}
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </>
  );
}
