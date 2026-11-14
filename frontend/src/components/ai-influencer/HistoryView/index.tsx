"use client";

import { useInfluencer } from "../InfluencerContext";
import { EmptyHistory } from "./EmptyHistory";
import { HistoryCard } from "./HistoryCard";
import styles from "./main.module.css";

/** Saved influencers, kept in this browser only. */
export function HistoryView() {
  const { state, dispatch } = useInfluencer();
  if (!state.roster.length) return <EmptyHistory onExplore={() => dispatch({ type: "view", view: "explore" })} />;
  return (
    <ul className={styles.grid}>
      {state.roster.map((item) => (
        <li key={item.id}>
          <HistoryCard
            item={item}
            disabled={state.status === "generating"}
            onOpen={() => dispatch({ type: "open", id: item.id })}
            onRemove={() => dispatch({ type: "remove", id: item.id })}
          />
        </li>
      ))}
    </ul>
  );
}
