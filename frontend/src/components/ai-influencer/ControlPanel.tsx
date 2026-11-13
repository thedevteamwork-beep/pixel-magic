"use client";

import { LoaderCircle, RotateCcw, Shuffle, Sparkles } from "lucide-react";
import { useRef } from "react";
import { archetypes, type TextField } from "@/constants/ai-influencer";
import { CharacterTypes } from "./CharacterTypes";
import { ControlSection } from "./ControlSection";
import { useInfluencer } from "./InfluencerContext";
import { ReferenceUpload } from "./ReferenceUpload";
import { TraitSections } from "./TraitSections";
import styles from "./ControlPanel.module.css";

export function ControlPanel() {
  const { state, dispatch, generate, randomize } = useInfluencer();
  const busy = state.status === "generating";
  const fields = useRef<Record<TextField, HTMLInputElement | HTMLTextAreaElement | null>>({ name: null, extra: null });

  async function submit() {
    if (busy) return;
    const invalid = await generate();
    if (invalid) fields.current[invalid]?.focus();
  }

  return (
    <aside className={styles.panel} aria-label="Create influencer">
      <header className={styles.header}>
        <div>
          <p>Create your own character with</p>
          <h1>AI Influencer</h1>
        </div>
        <button type="button" onClick={() => dispatch({ type: "reset" })} disabled={busy}>
          <RotateCcw size={12} aria-hidden="true" />
          Reset
        </button>
      </header>

      <form
        className={styles.form}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className={styles.scroll}>
          <ReferenceUpload />
          <ControlSection title="Character type" count={archetypes.length} defaultOpen>
            <CharacterTypes />
          </ControlSection>
          <TraitSections
            registerField={(key, node) => {
              fields.current[key] = node;
            }}
          />
        </div>
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.shuffle}
            onClick={randomize}
            disabled={busy}
            aria-label="Surprise me with a random look"
            title="Surprise me"
          >
            <Shuffle size={18} aria-hidden="true" />
          </button>
          <button type="submit" className={styles.generate} disabled={busy}>
            {busy ? <LoaderCircle size={17} className={styles.spinner} aria-hidden="true" /> : null}
            <span>{busy ? "Creating…" : state.variations.length ? "Generate again" : "Generate"}</span>
            {!busy && <Sparkles size={16} aria-hidden="true" />}
          </button>
        </div>
      </form>
      <p className={styles.note}>Preview · sample portraits · no credits</p>
    </aside>
  );
}
