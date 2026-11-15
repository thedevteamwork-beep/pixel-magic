"use client";

import { ArrowLeftRight, ArrowRight, Crop, Film, ImagePlus, Info, LoaderCircle, Plus, X } from "lucide-react";
import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { CLIP_MIME_TYPES, FRAME_MIME_TYPES, MAX_CLIP_SECONDS, MIN_CLIP_SECONDS } from "@/constants/video-generator";
import { closestAspectRatio, ratioValue } from "@/lib/video-generator/settings";
import type { FrameImage, VideoInputs, VideoMode, VideoModel } from "@/types/video-generator";
import styles from "./InputsSection.module.css";

export type InputTarget = "start" | "end" | "reference" | "clip";

type InputsSectionProps = {
  mode: Exclude<VideoMode, "text">;
  model: VideoModel;
  inputs: VideoInputs;
  busy: InputTarget | null;
  aspectRatio: string;
  error: string;
  onFiles: (target: InputTarget, files: readonly File[]) => void;
  onRemove: (target: InputTarget, id?: string) => void;
  onSwap: () => void;
  onClear: () => void;
  onMatchRatio: (ratio: string) => void;
};

const imageTypes = FRAME_MIME_TYPES.join(",");
const clipTypes = CLIP_MIME_TYPES.join(",");
const differs = (a: number, b: number) => Math.abs(Math.log(a / b)) > 0.04;

function DropSlot({ title, hint, badge, media, busy, accept, multiple = false, compact = false, onFiles, onRemove, label }: {
  title: string; hint?: string; badge?: string; media?: { url: string; kind: "image" | "video"; caption?: string } | null; busy: boolean;
  accept: string; multiple?: boolean; compact?: boolean; label: string; onFiles: (files: readonly File[]) => void; onRemove?: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  function drop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    setOver(false);
    if (event.dataTransfer.files.length) onFiles(Array.from(event.dataTransfer.files));
  }
  return <div className={styles.slot} data-filled={Boolean(media)} data-over={over} data-compact={compact}
    onDragOver={(event) => { if (event.dataTransfer.types.includes("Files")) { event.preventDefault(); setOver(true); } }}
    onDragLeave={() => setOver(false)} onDrop={drop}>
    <button type="button" className={styles.pick} onClick={() => input.current?.click()} disabled={busy} aria-label={media ? `Replace ${label}` : `Add ${label}`}>
      {media ? <>
        {media.kind === "image"
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={media.url} alt="" />
          : <video src={media.url} muted loop autoPlay playsInline aria-hidden="true" />}
        <span className={styles.replace} aria-hidden="true">Replace</span>
      </> : <span className={styles.empty}>
        {busy ? <LoaderCircle size={18} className={styles.spinner} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
        {!compact && <><strong>{title}</strong>{hint && <small>{hint}</small>}</>}
      </span>}
    </button>
    {media && badge && <span className={styles.badge}>{badge}</span>}
    {media?.caption && <span className={styles.caption}>{media.caption}</span>}
    {media && onRemove && <button type="button" className={styles.remove} onClick={onRemove} aria-label={`Remove ${label}`}><X size={12} aria-hidden="true" /></button>}
    <input ref={input} type="file" accept={accept} multiple={multiple} hidden aria-label={`Upload ${label}`}
      onChange={(event) => { onFiles(Array.from(event.target.files ?? [])); event.currentTarget.value = ""; }} />
  </div>;
}

function Header({ title, count, onClear, canClear }: { title: string; count?: ReactNode; onClear: () => void; canClear: boolean }) {
  return <div className={styles.header}>
    <span className={styles.title}>{title}{count && <span className={styles.count}>{count}</span>}</span>
    {canClear && <button type="button" className={styles.clear} onClick={onClear}>Clear all</button>}
  </div>;
}

function RatioNote({ frame, aspectRatio, model, onMatch }: { frame: FrameImage | null; aspectRatio: string; model: VideoModel; onMatch: (ratio: string) => void }) {
  if (!frame) return null;
  const suggested = closestAspectRatio(frame.width, frame.height, model.aspectRatios);
  if (suggested === aspectRatio || !differs(frame.width / frame.height, ratioValue(aspectRatio))) return null;
  return <p className={styles.note}><Crop size={13} aria-hidden="true" /><span>Your image is closest to <strong>{suggested}</strong>; at {aspectRatio} it will be cropped.</span>
    <button type="button" onClick={() => onMatch(suggested)}>Use {suggested}</button></p>;
}

export function InputsSection({ mode, model, inputs, busy, aspectRatio, error, onFiles, onRemove, onSwap, onClear, onMatchRatio }: InputsSectionProps) {
  const { start, end, references, clip } = inputs;

  if (mode === "image") {
    const mismatched = model.endFrame && start && end && differs(start.width / start.height, end.width / end.height);
    return <section className={styles.section} aria-label="Frames">
      <Header title="Frames" onClear={onClear} canClear={Boolean(start || (model.endFrame && end))} />
      <div className={styles.pair} data-single={!model.endFrame}>
        <DropSlot title="Start image" hint="The first frame" label="start image" badge="Start" accept={imageTypes} busy={busy === "start"}
          media={start && { url: start.url, kind: "image" }} onFiles={(files) => onFiles("start", files)} onRemove={() => onRemove("start")} />
        {model.endFrame && <>
          <span className={styles.between}>
            {start && end ? <button type="button" className={styles.swap} onClick={onSwap} aria-label="Swap start and end images" title="Swap"><ArrowLeftRight size={13} aria-hidden="true" /></button>
              : <ArrowRight size={15} aria-hidden="true" />}
          </span>
          <DropSlot title="End image" hint="(optional)" label="end image" badge="End" accept={imageTypes} busy={busy === "end"}
            media={end && { url: end.url, kind: "image" }} onFiles={(files) => onFiles("end", files)} onRemove={() => onRemove("end")} />
        </>}
      </div>
      {!model.endFrame && <p className={styles.hint}><Info size={12} aria-hidden="true" />{model.name} animates from a single start image.</p>}
      <RatioNote frame={start} aspectRatio={aspectRatio} model={model} onMatch={onMatchRatio} />
      {mismatched && <p className={styles.note}><Crop size={13} aria-hidden="true" /><span>Your images have different shapes. The end image will be cropped to match.</span></p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </section>;
  }

  if (mode === "reference") {
    const over = references.length - model.maxReferences;
    return <section className={styles.section} aria-label="References">
      <Header title="References" count={`${Math.min(references.length, model.maxReferences)}/${model.maxReferences}`} onClear={onClear} canClear={references.length > 0} />
      <div className={styles.grid}>
        {references.map((reference, index) => <div key={reference.id} className={styles.thumb} data-unused={index >= model.maxReferences}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={reference.url} alt={`Reference ${index + 1}: ${reference.name}`} />
          <span className={styles.index}>{index + 1}</span>
          <button type="button" className={styles.remove} onClick={() => onRemove("reference", reference.id)} aria-label={`Remove reference ${index + 1}`}><X size={12} aria-hidden="true" /></button>
        </div>)}
        {references.length < model.maxReferences && <DropSlot compact title="Add" label="reference images" accept={imageTypes} multiple busy={busy === "reference"}
          onFiles={(files) => onFiles("reference", files)} />}
      </div>
      {references.length === 0
        ? <p className={styles.hint}><ImagePlus size={12} aria-hidden="true" />Add people, products, places or a style. Refer to them in your prompt as image 1, image 2…</p>
        : over > 0 ? <p className={styles.note}><Info size={13} aria-hidden="true" /><span>{model.name} uses up to {model.maxReferences}. The last {over === 1 ? "one is" : `${over} are`} dimmed and won’t be sent.</span></p>
          : <p className={styles.hint}><Info size={12} aria-hidden="true" />Mention them in your prompt, e.g. “the person in image 1 holds the bottle from image 2”.</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </section>;
  }

  return <section className={styles.section} aria-label="Motion control">
    <Header title="Motion" onClear={onClear} canClear={Boolean(start || clip)} />
    <div className={styles.pair}>
      <DropSlot title="Character" hint="Who should move" label="character image" badge="Character" accept={imageTypes} busy={busy === "start"}
        media={start && { url: start.url, kind: "image" }} onFiles={(files) => onFiles("start", files)} onRemove={() => onRemove("start")} />
      <span className={styles.between}><ArrowLeftRight size={15} aria-hidden="true" /></span>
      <DropSlot title="Motion clip" hint={`${MIN_CLIP_SECONDS}–${MAX_CLIP_SECONDS}s video`} label="motion clip" badge="Motion" accept={clipTypes} busy={busy === "clip"}
        media={clip && { url: clip.url, kind: "video", caption: `${Math.round(clip.duration)}s` }} onFiles={(files) => onFiles("clip", files)} onRemove={() => onRemove("clip")} />
    </div>
    <p className={styles.hint}><Film size={12} aria-hidden="true" />Use a clear, full-body clip. Your video follows its movement and length.</p>
    <RatioNote frame={start} aspectRatio={aspectRatio} model={model} onMatch={onMatchRatio} />
    {error && <p className={styles.error} role="alert">{error}</p>}
  </section>;
}

