"use client";

import { Compass, History, LayoutGrid } from "lucide-react";
import { ExploreView } from "../ExploreView";
import { HistoryView } from "../HistoryView";
import { useInfluencer } from "../InfluencerContext";
import { TemplatesView } from "../TemplatesView";
import { StageTabs, type StageTab } from "./StageTabs";
import styles from "./main.module.css";

/** Right-hand stage: explore influencers, choose a template, or see your influencers (the newest on top). */
export function Stage() {
  const { state, dispatch } = useInfluencer();
  const tabs: StageTab[] = [
    { id: "explore", label: "Explore", icon: Compass },
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
        {state.view === "templates" && <TemplatesView />}
        {state.view === "history" && <HistoryView />}
      </div>
    </section>
  );
}
