"use client";

import { Compass, History, Sparkles } from "lucide-react";
import { ExploreView } from "../ExploreView";
import { HistoryView } from "../HistoryView";
import { useInfluencer } from "../InfluencerContext";
import { PromptDock } from "../PromptDock";
import { ResultView } from "../ResultView";
import { StageTabs, type StageTab } from "./StageTabs";
import styles from "./main.module.css";

/** Right-hand stage: Explore sample looks, see the current result, or open saved influencers. */
export function Stage() {
  const { state, dispatch } = useInfluencer();
  const hasResult = state.variations.length > 0 || state.status === "generating";
  const tabs: StageTab[] = [
    { id: "explore", label: "Explore", icon: Compass },
    ...(hasResult ? [{ id: "result" as const, label: "Result", icon: Sparkles }] : []),
    { id: "history", label: "History", icon: History, count: state.roster.length },
  ];

  return (
    <section className={styles.stage} aria-label="Influencer stage">
      <StageTabs tabs={tabs} active={state.view} onSelect={(view) => dispatch({ type: "view", view })} />
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
      <PromptDock />
    </section>
  );
}
