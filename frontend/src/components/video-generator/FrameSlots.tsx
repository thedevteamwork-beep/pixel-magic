"use client";

import { ArrowLeftRight, Crop, ImagePlus, LoaderCircle, X } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { FRAME_MIME_TYPES } from "@/constants/video-generator";
import { closestAspectRatio, ratioValue } from "@/lib/video-generator/settings";
import type { FrameImage, FrameSlot, VideoMode } from "@/types/video-generator";
import styles from "./FrameSlots.module.css";

type FrameSlotsProps = {
  mode: Exclude<VideoMode, "text">;
  frames: Record<FrameSlot, FrameImage | null>;
  busy: FrameSlot | null;
  aspectRatio: string;
  supportedRatios: readonly string[];
  onFiles: (slot: FrameSlot, files: readonly File[]) => void;
  onRemove: (slot: FrameSlot) => void;
  onSwap: () => void;
  onMatchRatio: (ratio: string) => void;
  error?: string;
};

const labels: Record<FrameSlot, { title: string; hint: string }> = {
  start: { title: "Start frame", hint: "The first moment of your shot" },
  end: { title: "End frame", hint: "Where the shot lands" },
};

function differs(a: number, b: number) { return Math.abs(Math.log(a / b)) > 0.04; }

export function FrameSlots({ mode, frames, busy, aspectRatio, supportedRatios, onFiles, onRemove, onSwap, onMatchRatio, error }: FrameSlotsProps) {
  const slots: FrameSlot[] = mode === "frames" ? ["start", "end"] : ["start"];
  const start = frames.start;
  const suggested = start ? closestAspectRatio(start.width, start.height, supportedRatios) : null;
  const cropped = start && suggested && suggested !== aspectRatio && differs(start.width / start.height, ratioValue(aspectRatio));
  const mismatched = mode === "frames" && start && frames.end && differs(start.width / start.height, frames.end.width / frames.end.height);

  return <div className={styles.frames}>
    <div className={styles.slots} data-count={slots.length}>
      {slots.map((slot, index) => <div key={slot} className={styles.slotWrap}>
        <Slot slot={slot} frame={frames[slot]} busy={busy === slot} onFiles={(files) => onFiles(slot, files)} onRemove={() => onRemove(slot)} />
        {index === 0 && slots.length > 1 && <button type="button" className={styles.swap} onClick={onSwap} disabled={!frames.start && !frames.end}
          aria-label="Swap start and end frames" title="Swap frames"><ArrowLeftRight size={14} aria-hidden="true" /></button>}
      </div>)}
    </div>
    {cropped && <p className={styles.note}><Crop size={13} aria-hidden="true" /><span>Your frame is closest to <strong>{suggested}</strong>; at {aspectRatio} it will be cropped.</span>
      <button type="button" onClick={() => onMatchRatio(suggested)}>Use {suggested}</button></p>}
    {mismatched && <p className={styles.note}><Crop size={13} aria-hidden="true" /><span>Your frames have different shapes. The end frame will be cropped to match the start.</span></p>}
    {error && <p className={styles.error} role="alert">{error}</p>}
  </div>;
}

function Slot({ slot, frame, busy, onFiles, onRemove }: { slot: FrameSlot; frame: FrameImage | null; busy: boolean; onFiles: (files: readonly File[]) => void; onRemove: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const { title, hint } = labels[slot];
  function drop(event: DragEvent) {
    event.preventDefault();
    setOver(false);
    const files = Array.from(event.dataTransfer.files);
    if (files.length) onFiles(files);
  }
  return <div className={styles.slot} data-filled={Boolean(frame)} data-over={over}
    onDragOver={(event) => { if (event.dataTransfer.types.includes("Files")) { event.preventDefault(); setOver(true); } }}
    onDragLeave={() => setOver(false)} onDrop={drop}>
    <button type="button" className={styles.pick} onClick={() => input.current?.click()} disabled={busy}
      aria-label={frame ? `Replace ${title.toLowerCase()}, currently ${frame.name}` : `Add ${title.toLowerCase()}`}>
      {frame ? <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={frame.url} alt="" />
        <span className={styles.replace} aria-hidden="true">Replace</span>
      </> : <span className={styles.empty}>
        {busy ? <LoaderCircle size={20} className={styles.spinner} aria-hidden="true" /> : <ImagePlus size={20} strokeWidth={1.6} aria-hidden="true" />}
        <strong>{title}</strong>
        <small>{hint}</small>
      </span>}
    </button>
    {frame && <span className={styles.badge}>{slot === "start" ? "Start" : "End"}</span>}
    {frame && <button type="button" className={styles.remove} onClick={onRemove} aria-label={`Remove ${title.toLowerCase()}`}><X size={13} aria-hidden="true" /></button>}
    <input ref={input} type="file" accept={FRAME_MIME_TYPES.join(",")} hidden aria-label={`Upload ${title.toLowerCase()}`}
      onChange={(event) => { onFiles(Array.from(event.target.files ?? [])); event.currentTarget.value = ""; }} />
  </div>;
}
