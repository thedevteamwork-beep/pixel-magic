"use client";

import { composeInfluencerPrompt, displayName, traitLabel } from "@/lib/ai-influencer/prompt";
import { useInfluencer } from "../InfluencerContext";
import { ErrorBanner } from "./ErrorBanner";
import { PromptDetails } from "./PromptDetails";
import { ResultCanvas } from "./ResultCanvas";
import { ResultToolbar } from "./ResultToolbar";
import { VariationStrip } from "./VariationStrip";
import styles from "./main.module.css";

export function ResultView() {
  const { state, dispatch, cancel, modelTakesReference } = useInfluencer();
  const { traits, variations, selectedId, status, projectId, reference } = state;
  const busy = status === "generating";
  const selected = variations.find((item) => item.id === selectedId) ?? null;
  const summary = [
    traitLabel("age", traits.age),
    traits.ethnicity && traitLabel("ethnicity", traits.ethnicity),
    traitLabel("gender", traits.gender),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={styles.result}>
      <ResultToolbar name={displayName(traits)} summary={summary} saved={projectId !== null} />
      <ResultCanvas selected={selected} busy={busy} name={displayName(traits)} onCancel={cancel} />
      <VariationStrip
        variations={variations}
        selectedId={selectedId}
        busy={busy}
        onSelect={(id) => dispatch({ type: "select", id })}
      />
      {state.error && <ErrorBanner message={state.error} onDismiss={() => dispatch({ type: "dismissError" })} />}
      <PromptDetails prompt={composeInfluencerPrompt(traits, Boolean(reference) && modelTakesReference)} />
      {/* The strip shows every variation, so this count matches it. */}
      <span className={styles.srOnly} aria-live="polite">
        {variations.length && !busy
          ? `${variations.length} ${variations.length === 1 ? "variation" : "variations"} ready.`
          : ""}
      </span>
    </div>
  );
}
