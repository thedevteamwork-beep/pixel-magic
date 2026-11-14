"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { MAX_EXTRA_LENGTH } from "@/components/ai-influencer/constants";
import { useInfluencer } from "../InfluencerContext";
import styles from "./main.module.css";

const MAX_HEIGHT = 120;

/** Prompt box under the stage. Whatever is typed here is sent with the next generation as extra direction. */
export function PromptDock() {
  const { state, dispatch, generate, registerField } = useInfluencer();
  const { extra } = state.traits;
  const busy = state.status === "generating";
  const error = state.fieldErrors.extra ?? state.fieldErrors.name;
  const input = useRef<HTMLTextAreaElement | null>(null);
  const id = useId();

  // Grow with the text, up to a few lines.
  useEffect(() => {
    const element = input.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, MAX_HEIGHT)}px`;
  }, [extra]);

  function send() {
    if (!busy) void generate();
  }

  return (
    <form
      className={styles.dock}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      <label className={styles.srOnly} htmlFor={id}>
        Prompt or suggestion for your influencer
      </label>
      <textarea
        id={id}
        ref={(node) => {
          input.current = node;
          registerField("extra", node);
        }}
        className={styles.input}
        rows={1}
        value={extra}
        maxLength={MAX_EXTRA_LENGTH}
        placeholder="Describe your influencer or add a suggestion: freckles, gold hoop earrings, warm smile…"
        disabled={busy}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => dispatch({ type: "trait", key: "extra", value: event.target.value })}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            send();
          }
        }}
      />
      <div className={styles.row}>
        <span className={styles.hint}>Enter to generate · Shift+Enter for a new line</span>
        <span className={styles.count}>
          {extra.length}/{MAX_EXTRA_LENGTH}
        </span>
        <button type="submit" className={styles.send} disabled={busy} aria-label="Generate with this prompt">
          <ArrowUp size={18} aria-hidden="true" />
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
