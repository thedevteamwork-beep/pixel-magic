"use client";

import { archetypes } from "@/components/ai-influencer/constants";
import { CharacterTypes } from "../CharacterTypes";
import { ControlSection } from "../ControlSection";
import { useInfluencer } from "../InfluencerContext";
import { ReferenceUpload } from "../ReferenceUpload";
import { TraitSections } from "../TraitSections";
import { PanelFooter } from "./PanelFooter";
import { PanelHeader } from "./PanelHeader";
import styles from "./main.module.css";

export function ControlPanel() {
  const { state, dispatch, generate, randomize, newInfluencer } = useInfluencer();
  const busy = state.status === "generating";
  return (
    <aside className={styles.panel} aria-label="Create influencer">
      <PanelHeader disabled={busy} onNew={() => newInfluencer()} />

      <form
        className={styles.form}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (!busy) void generate();
        }}
      >
        <div className={styles.scroll}>
          <ReferenceUpload />
          <ControlSection title="Character type" count={archetypes.length} defaultOpen>
            <CharacterTypes />
          </ControlSection>
          <TraitSections />
        </div>
        <PanelFooter
          busy={busy}
          hasResult={state.variations.length > 0}
          models={state.models}
          modelKey={state.modelKey}
          onModelChange={(key) => dispatch({ type: "model", key })}
          onShuffle={randomize}
        />
      </form>
    </aside>
  );
}
