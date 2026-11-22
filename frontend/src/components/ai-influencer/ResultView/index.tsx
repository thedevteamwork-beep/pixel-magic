"use client";

import { downloadPortrait } from "@/lib/ai-influencer/download";
import { displayName, traitLabel } from "@/lib/ai-influencer/prompt";
import { useInfluencer } from "../InfluencerContext";
import { ErrorBanner } from "./ErrorBanner";
import { PromptDetails } from "./PromptDetails";
import { ResultCanvas } from "./ResultCanvas";
import { ResultToolbar } from "./ResultToolbar";
import styles from "./main.module.css";

export function ResultView() {
  const { state, dispatch, aspectRatio, reuseInputs } = useInfluencer();
  const { traits, variations, selectedId, status, projectId, archetypeId } = state;
  const title = displayName(traits, archetypeId);
  const busy = status === "generating";
  const selected = variations.find((item) => item.id === selectedId) ?? null;
  const userPrompt = selected?.userPrompt ?? traits.extra.trim();
  // The shown influencer's inputs can come back once it is saved in History.
  const canReuse = selected !== null && !busy && state.projects.some((project) => project.projectId === projectId);
  const summary = [
    traitLabel("age", traits.age),
    traits.ethnicity && traitLabel("ethnicity", traits.ethnicity),
    traitLabel("gender", traits.gender),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={styles.result}>
      <ResultToolbar
        name={title}
        summary={summary}
        saved={projectId !== null}
        onReuse={canReuse ? reuseInputs : undefined}
        onDownload={selected && !busy ? () => void downloadPortrait(title, selected.url) : undefined}
      />
      <ResultCanvas selected={selected} busy={busy} name={title} aspectRatio={aspectRatio} />
      {state.error && <ErrorBanner message={state.error} onDismiss={() => dispatch({ type: "dismissError" })} />}
      {/* What the user wrote for the portrait on show (a sample influencer opened from History keeps it in its saved
          notes). Hidden while the next one is being made, and when they wrote nothing. */}
      {selected && !busy && userPrompt && <PromptDetails prompt={userPrompt} />}
      <span className={styles.srOnly} aria-live="polite">
        {selected && !busy ? `${title}'s portrait is ready.` : ""}
      </span>
    </div>
  );
}
