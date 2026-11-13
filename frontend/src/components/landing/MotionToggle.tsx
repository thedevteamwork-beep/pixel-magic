"use client";

import { Pause, Play } from "lucide-react";
import { useLandingMotion } from "./LandingProvider";
import styles from "./MotionToggle.module.css";

export function MotionToggle() {
  const { motionEnabled, toggleMotion } = useLandingMotion();
  const label = motionEnabled ? "Pause animations" : "Enable animations";
  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={toggleMotion}
      aria-label={label}
      aria-pressed={motionEnabled}
      title={label}
    >
      {motionEnabled ? (
        <Pause size={17} strokeWidth={1.75} aria-hidden="true" />
      ) : (
        <Play size={17} strokeWidth={1.75} aria-hidden="true" />
      )}
      {motionEnabled && <span className={styles.status} aria-hidden="true" />}
    </button>
  );
}
