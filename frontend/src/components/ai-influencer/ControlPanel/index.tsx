"use client";

import { Accordion } from "@/ui/Accordion";
import { useInfluencer } from "../InfluencerContext";
import { ReferenceUpload } from "../ReferenceUpload";
import { TraitSections } from "../TraitSections";
import { PanelFooter } from "./PanelFooter";
import { PanelHeader } from "./PanelHeader";
import { PromptField } from "./PromptField";
import styles from "./main.module.css";

export function ControlPanel() {
  const { state, dispatch, generate, randomize, newInfluencer, registerField } = useInfluencer();
  const busy = state.status === "generating";
  const send = () => {
    if (!busy) void generate();
  };
  return (
    <aside className={styles.panel} aria-label="Create influencer">
      <PanelHeader disabled={busy} onNew={() => newInfluencer()} />

      <form
        className={styles.form}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <div className={styles.scroll}>
          <ReferenceUpload />
          <Accordion defaultActiveEventKey="character">
            <TraitSections part="lead" />
            <TraitSections part="main" />
          </Accordion>
        </div>
        <div className={styles.footer}>
          <PromptField
            value={state.traits.extra}
            error={state.fieldErrors.extra}
            disabled={busy}
            onChange={(value) => dispatch({ type: "trait", key: "extra", value })}
            onSubmit={send}
            inputRef={(node) => registerField("extra", node)}
          />
          <PanelFooter busy={busy} hasResult={state.variations.length > 0} onShuffle={randomize} />
        </div>
      </form>
    </aside>
  );
}
