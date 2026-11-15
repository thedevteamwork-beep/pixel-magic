"use client";

import { Compass, History, LayoutGrid, Sparkles } from "lucide-react";
import { ExploreView } from "../ExploreView";
import { HistoryView } from "../HistoryView";
import { useInfluencer } from "../InfluencerContext";
import { ResultView } from "../ResultView";
import { TemplatesView } from "../TemplatesView";
import { StageTabs, type StageTab } from "./StageTabs";
import styles from "./main.module.css";

/** Right-hand stage: explore influencers, choose a template, view results, or open saved influencers. */
export function Stage() {
  const { state, dispatch } = useInfluencer();
  // An open project keeps its Result tab even before its first portrait, and the shown view always has its tab.
  const showResult =
    state.variations.length > 0 || state.status === "generating" || state.projectId !== null || state.view === "result";
  const tabs: StageTab[] = [
    { id: "explore", label: "Explore", icon: Compass },
    ...(showResult ? [{ id: "result" as const, label: "Result", icon: Sparkles }] : []),
    { id: "templates", label: "Templates", icon: LayoutGrid },
    { id: "history", label: "History", icon: History, count: state.projects.length },
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
        {state.view === "templates" && <TemplatesView />}
        {state.view === "history" && <HistoryView />}
      </div>
    </section>
  );
}
