"use client";

import { Compass, History, Sparkles } from "lucide-react";
import type { StageView } from "@/types/ai-influencer";
import { ExploreView } from "./ExploreView";
import { HistoryView } from "./HistoryView";
import { useInfluencer } from "./InfluencerContext";
import { ResultView } from "./ResultView";
import styles from "./Stage.module.css";

/** Right-hand stage: Explore sample looks, see the current result, or open saved influencers. */
export function Stage() {
  const { state, dispatch } = useInfluencer();
  const hasResult = state.variations.length > 0 || state.status === "generating";
  const tabs: { id: StageView; label: string; icon: typeof Compass; count?: number; hidden?: boolean }[] = [
    { id: "explore", label: "Explore", icon: Compass },
    { id: "result", label: "Result", icon: Sparkles, hidden: !hasResult },
    { id: "history", label: "History", icon: History, count: state.roster.length },
  ];

  return (
    <section className={styles.stage} aria-label="Influencer stage">
      <div className={styles.tabs} role="tablist" aria-label="Stage views">
        {tabs
          .filter((tab) => !tab.hidden)
          .map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`stage-tab-${id}`}
              aria-selected={state.view === id}
              aria-controls="stage-panel"
              onClick={() => dispatch({ type: "view", view: id })}
            >
              <Icon size={15} aria-hidden="true" />
              {label}
              {count ? <span>{count}</span> : null}
            </button>
          ))}
      </div>
      <div
        id="stage-panel"
        role="tabpanel"
        aria-labelledby={`stage-tab-${state.view}`}
        className={styles.panel}
        data-view={state.view}
      >
        {state.view === "explore" && <ExploreView />}
        {state.view === "result" && <ResultView />}
        {state.view === "history" && <HistoryView />}
      </div>
    </section>
  );
}
