"use client";

import { CharacterTypes } from "../CharacterTypes";
import styles from "./main.module.css";

export function TemplatesView() {
  return (
    <section className={styles.templates} aria-labelledby="templates-title">
      <header className={styles.heading}>
        <p>READY-MADE LOOKS</p>
        <h2 id="templates-title">Start with a template</h2>
        <span>Choose a human or animal character to fill in the creator controls, then customize the look.</span>
      </header>
      <CharacterTypes />
    </section>
  );
}
