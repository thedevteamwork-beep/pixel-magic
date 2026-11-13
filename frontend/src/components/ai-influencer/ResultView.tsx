"use client";

import Image from "next/image";
import { Bookmark, LoaderCircle, Sparkles, X } from "lucide-react";
import { VARIATION_COUNT } from "@/constants/ai-influencer";
import { composeInfluencerPrompt, displayName, traitLabel } from "@/lib/ai-influencer/prompt";
import type { InfluencerVariation } from "@/types/ai-influencer";
import { useInfluencer } from "./InfluencerContext";
import styles from "./ResultView.module.css";

const portraitStyle = (variation: InfluencerVariation) => ({
  objectPosition: variation.position,
  filter: `hue-rotate(${variation.hue}deg) saturate(1.05)`,
});

export function ResultView() {
  const { state, dispatch, cancel } = useInfluencer();
  const { traits, variations, selectedId, status, roster, reference } = state;
  const busy = status === "generating";
  const selected = variations.find((item) => item.id === selectedId) ?? null;
  const saved = !!selected && roster.some((item) => item.cover.id === selected.id);
  const summary = [
    traitLabel("age", traits.age),
    traitLabel("ethnicity", traits.ethnicity),
    traitLabel("gender", traits.gender),
  ].join(" · ");

  return (
    <div className={styles.result}>
      <header className={styles.toolbar}>
        <div className={styles.info}>
          <span className={styles.name}>{displayName(traits)}</span>
          <span className={styles.summary}>{summary}</span>
        </div>
        <button
          type="button"
          className={styles.save}
          onClick={() => dispatch({ type: "save" })}
          disabled={!selected || saved || busy}
        >
          <Bookmark size={14} aria-hidden="true" />
          {saved ? "Saved" : "Save influencer"}
        </button>
      </header>

      <div className={styles.canvas}>
        {selected && (
          <figure className={styles.hero}>
            <Image
              key={selected.id}
              src={selected.url}
              alt={selected.alt}
              fill
              sizes="(max-width: 900px) 90vw, 520px"
              className={styles.portrait}
              style={portraitStyle(selected)}
              preload
            />
            <figcaption className={styles.badge}>Sample preview</figcaption>
          </figure>
        )}
        {busy && (
          <div className={styles.busy} role="status">
            <LoaderCircle className={styles.spinner} size={24} aria-hidden="true" />
            <strong>Creating {displayName(traits)}…</strong>
            <button type="button" onClick={cancel} autoFocus>
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className={styles.strip} role="radiogroup" aria-label="Variations">
        {Array.from({ length: VARIATION_COUNT }, (_, index) => {
          const item = variations[index];
          return item ? (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={item.id === selectedId}
              aria-label={`Variation ${index + 1}`}
              className={styles.thumb}
              disabled={busy}
              onClick={() => dispatch({ type: "select", id: item.id })}
            >
              <Image
                src={item.url}
                alt=""
                fill
                sizes="64px"
                className={styles.thumbImage}
                style={portraitStyle(item)}
              />
            </button>
          ) : (
            <span key={index} className={styles.slot} aria-hidden="true">
              <Sparkles size={14} />
            </span>
          );
        })}
      </div>

      {state.error && (
        <p className={styles.error} role="alert">
          {state.error}
          <button type="button" onClick={() => dispatch({ type: "dismissError" })} aria-label="Dismiss error">
            <X size={15} />
          </button>
        </p>
      )}
      <details className={styles.prompt}>
        <summary>Prompt used</summary>
        <p>{composeInfluencerPrompt(traits, Boolean(reference))}</p>
      </details>
      <span className={styles.srOnly} aria-live="polite">
        {variations.length && !busy ? `${variations.length} variations ready.` : ""}
      </span>
    </div>
  );
}
