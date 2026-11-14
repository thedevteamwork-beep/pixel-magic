"use client";

import { ChevronDown, Expand, Minus, Plus } from "lucide-react";
import { aspectRatios, defaultImageSettings, imageCounts, qualities, resolutions } from "@/constants/image-generator";
import type { ImageSettings } from "@/types/image-generator";
import { ModelPicker } from "./ModelPicker";
import styles from "./main.module.css";

type DockSettingsProps = {
  settings: ImageSettings;
  onChange: (patch: Partial<ImageSettings>) => void;
  disabled?: boolean;
};

export function DockSettings({ settings, onChange, disabled = false }: DockSettingsProps) {
  const minimumCount = imageCounts[0];
  const maximumCount = imageCounts[imageCounts.length - 1];
  const selectedQuality = qualities.find((quality) => quality === settings.quality) ?? defaultImageSettings.quality;

  return (
    <div className={styles.controls} role="group" aria-label="Image generation settings">
      <ModelPicker compact value={settings.model} onChange={(model) => onChange({ model })} disabled={disabled} />
      <label className={`${styles.selectControl} ${styles.ratio}`}>
        <Expand className={styles.controlIcon} size={14} aria-hidden="true" />
        <select
          aria-label="Aspect ratio"
          title="Aspect ratio"
          value={settings.aspectRatio}
          disabled={disabled}
          onChange={(event) => onChange({ aspectRatio: event.target.value })}
        >
          {aspectRatios.map((ratio) => (
            <option key={ratio}>{ratio}</option>
          ))}
        </select>
        <ChevronDown className={styles.selectChevron} size={12} aria-hidden="true" />
      </label>
      <label className={`${styles.selectControl} ${styles.quality}`}>
        <select
          aria-label="Quality"
          title="Quality"
          value={selectedQuality}
          disabled={disabled}
          onChange={(event) => onChange({ quality: event.target.value })}
        >
          {qualities.map((quality) => (
            <option key={quality}>{quality}</option>
          ))}
        </select>
        <ChevronDown className={styles.selectChevron} size={12} aria-hidden="true" />
      </label>
      <label className={`${styles.selectControl} ${styles.resolution}`}>
        <select
          aria-label="Resolution"
          title="Resolution"
          value={settings.resolution}
          disabled={disabled}
          onChange={(event) => onChange({ resolution: event.target.value })}
        >
          {resolutions.map((resolution) => (
            <option key={resolution}>{resolution}</option>
          ))}
        </select>
        <ChevronDown className={styles.selectChevron} size={12} aria-hidden="true" />
      </label>
      <div className={styles.count} role="group" aria-label="Number of images">
        <button
          type="button"
          aria-label="Generate one fewer image"
          disabled={disabled || settings.count <= minimumCount}
          onClick={() => onChange({ count: Math.max(minimumCount, settings.count - 1) })}
        >
          <Minus size={13} aria-hidden="true" />
        </button>
        <output aria-label="Image count" aria-live="polite">
          {settings.count}
          <span>/{maximumCount}</span>
        </output>
        <button
          type="button"
          aria-label="Generate one more image"
          disabled={disabled || settings.count >= maximumCount}
          onClick={() => onChange({ count: Math.min(maximumCount, settings.count + 1) })}
        >
          <Plus size={13} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
