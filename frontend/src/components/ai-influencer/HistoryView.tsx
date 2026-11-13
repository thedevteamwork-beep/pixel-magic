"use client";

import Image from "next/image";
import { History, Trash2 } from "lucide-react";
import { displayName, traitLabel } from "@/lib/ai-influencer/prompt";
import { useInfluencer } from "./InfluencerContext";
import styles from "./HistoryView.module.css";

/** Saved influencers, kept in this browser only. */
export function HistoryView() {
  const { state, dispatch } = useInfluencer();
  if (!state.roster.length)
    return (
      <div className={styles.empty}>
        <span aria-hidden="true">
          <History size={22} strokeWidth={1.5} />
        </span>
        <h2>No saved influencers yet</h2>
        <p>Generate one and choose “Save influencer” to keep them here.</p>
        <button type="button" onClick={() => dispatch({ type: "view", view: "explore" })}>
          Explore looks
        </button>
      </div>
    );
  return (
    <ul className={styles.grid}>
      {state.roster.map((item) => (
        <li key={item.id} className={styles.item}>
          <button
            type="button"
            className={styles.card}
            onClick={() => dispatch({ type: "open", id: item.id })}
            disabled={state.status === "generating"}
            aria-label={`Open ${displayName(item.traits)}`}
          >
            <Image
              src={item.cover.url}
              alt=""
              fill
              sizes="(max-width: 700px) 45vw, 220px"
              className={styles.image}
              style={{ objectPosition: item.cover.position, filter: `hue-rotate(${item.cover.hue}deg)` }}
            />
            <span className={styles.shade} aria-hidden="true" />
            <span className={styles.meta}>
              <strong>{displayName(item.traits)}</strong>
              <small>
                {traitLabel("hairStyle", item.traits.hairStyle)} · {traitLabel("outfit", item.traits.outfit)}
              </small>
            </span>
          </button>
          <button
            type="button"
            className={styles.remove}
            onClick={() => dispatch({ type: "remove", id: item.id })}
            aria-label={`Remove ${displayName(item.traits)}`}
          >
            <Trash2 size={14} />
          </button>
        </li>
      ))}
    </ul>
  );
}
