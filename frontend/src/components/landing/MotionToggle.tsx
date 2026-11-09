"use client";

import { Pause, Play } from "lucide-react";
import { useLandingMotion } from "./LandingProvider";
import styles from "./MotionToggle.module.css";

export function MotionToggle() {
  const { motionEnabled, toggleMotion } = useLandingMotion();
  return <button type="button" className={styles.toggle} onClick={toggleMotion}
    aria-label={motionEnabled ? "Pause all motion previews" : "Enable motion previews"} aria-pressed={motionEnabled}>
    {motionEnabled ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
    <span>{motionEnabled ? "Motion on" : "Motion off"}</span>
  </button>;
}
