"use client";

import { Media } from "@/ui/Media";
import { Check, ChevronRight, Focus } from "lucide-react";
import { useState } from "react";
import { landingAssets } from "@/constants/landing-media";
import { motionGroups, motionPresets } from "@/components/video-generator/constants";
import { useLandingMotion } from "@/components/landing/LandingProvider";
import { Modal } from "@/components/landing/Modal";
import type { MotionPreset } from "@/types/video-generator";
import motion from "@/assets/styles/camera-motion.module.css";
import styles from "./main.module.css";

type Group = "All" | (typeof motionGroups)[number];

export function MotionPreview({
  preset,
  playing,
  src,
  sizes,
}: {
  preset: MotionPreset;
  playing: boolean;
  src?: string;
  sizes: string;
}) {
  const asset = landingAssets[preset.asset];
  return (
    <span
      className={`${motion.stage} ${playing ? motion.playing : ""} ${styles.preview}`}
      data-motion={preset.id}
      aria-hidden="true"
    >
      <Media
        media={{ kind: "image", src: src ?? asset.image, alt: "" }}
        fill
        sizes={sizes}
        plain
        className={motion.layer}
      />
    </span>
  );
}

export function MotionPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { motionEnabled } = useLandingMotion();
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState<Group>("All");
  const [hovered, setHovered] = useState<string | null>(null);
  const selected = motionPresets.find((preset) => preset.id === value) ?? motionPresets[0];
  const visible = motionPresets.filter((preset) => group === "All" || preset.group === group);

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`Camera motion: ${selected.name}. Change`}
      >
        <MotionPreview preset={selected} playing={motionEnabled} sizes="72px" />
        <span className={styles.triggerCopy}>
          <strong>{selected.name}</strong>
          <small>{selected.description}</small>
        </span>
        <ChevronRight size={16} aria-hidden="true" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Camera motion" className={styles.dialog}>
        <div className={styles.body}>
          <div className={styles.intro}>
            <p>Direct the camera like a cinematographer. Hover a move to preview it.</p>
            <div className={styles.groups} role="group" aria-label="Filter camera moves">
              {(["All", ...motionGroups] as const).map((name) => (
                <button type="button" key={name} aria-pressed={group === name} onClick={() => setGroup(name)}>
                  {name}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.motionPickerGrid}>
            {visible.map((preset) => (
              <button
                type="button"
                key={preset.id}
                className={styles.tile}
                aria-pressed={value === preset.id}
                onClick={() => {
                  onChange(preset.id);
                  setOpen(false);
                }}
                onPointerEnter={() => setHovered(preset.id)}
                onPointerLeave={() => setHovered(null)}
                onFocus={() => setHovered(preset.id)}
                onBlur={() => setHovered(null)}
              >
                <span className={styles.tileMedia}>
                  <MotionPreview
                    preset={preset}
                    playing={motionEnabled && (hovered === preset.id || value === preset.id)}
                    sizes="(max-width: 600px) 45vw, 200px"
                  />
                  {value === preset.id && (
                    <span className={styles.check}>
                      <Check size={13} aria-hidden="true" />
                    </span>
                  )}
                  {preset.needsSubject && (
                    <span className={styles.subject} title="Best with one clear, centered subject" aria-hidden="true">
                      <Focus size={11} />
                      Subject
                    </span>
                  )}
                </span>
                <strong>{preset.name}</strong>
                <small>
                  {preset.description}
                  {preset.needsSubject && (
                    <span className={styles.motionPickerSrOnly}> Best with one clear, centered subject.</span>
                  )}
                </small>
              </button>
            ))}
          </div>
          {!motionEnabled && (
            <p className={styles.motionPickerNote}>Previews are paused because reduced motion is on.</p>
          )}
        </div>
      </Modal>
    </>
  );
}
