"use client";

import { ControlPanel } from "../ControlPanel";
import { InfluencerProvider } from "../InfluencerContext";
import { Stage } from "../Stage";
import styles from "./main.module.css";

export function InfluencerWorkspace() {
  return (
    <InfluencerProvider>
      <main id="main-content" className={styles.workspace} tabIndex={-1}>
        <ControlPanel />
        <Stage />
      </main>
    </InfluencerProvider>
  );
}
