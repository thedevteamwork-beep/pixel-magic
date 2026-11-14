"use client";

import { Media } from "@/ui/Media";
import { ArrowDownToLine, AudioLines, Heart, ImagePlus, Play, RotateCcw, TriangleAlert, X } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { motionPresets, renderStages } from "@/components/video-generator/constants";
import { downloadName, ratioValue } from "@/lib/video-generator/settings";
import type { RenderJob, VideoResult } from "@/types/video-generator";
import motion from "@/assets/styles/camera-motion.module.css";
import styles from "./main.module.css";

export function ratioStyle(aspectRatio: string): CSSProperties {
  return { "--ratio": ratioValue(aspectRatio) } as CSSProperties;
}

type VideoCardProps = {
  item: VideoResult;
  index: number;
  autoplay: boolean;
  onOpen: () => void;
  onFavorite: () => void;
  onUseFrame: () => void;
};

/** Poster at rest; plays muted on hover or keyboard focus. */
export function VideoCard({ item, index, autoplay, onOpen, onFavorite, onUseFrame }: VideoCardProps) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  function start() {
    if (!autoplay) return;
    const element = video.current;
    if (!element) return;
    element
      .play()
      .then(() => setPlaying(true))
      .catch(() => {});
  }
  function stop() {
    const element = video.current;
    if (!element) return;
    element.pause();
    element.currentTime = 0;
    setPlaying(false);
    setProgress(0);
  }

  return (
    <article
      className={styles.card}
      style={{ ...ratioStyle(item.aspectRatio), "--delay": `${index * 70}ms` } as CSSProperties}
      data-playing={playing}
      onPointerEnter={start}
      onPointerLeave={stop}
      onFocus={(event) => {
        if (event.currentTarget.matches(":focus-within")) start();
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) stop();
      }}
    >
      <button
        type="button"
        className={styles.open}
        onClick={onOpen}
        aria-haspopup="dialog"
        aria-label={`Open video ${index + 1}: ${item.alt}`}
      >
        <Media
          media={{ kind: "image", src: item.poster, alt: "" }}
          fill
          sizes="(max-width: 700px) 90vw, 480px"
          plain
          className={styles.poster}
        />
        <video
          ref={video}
          src={item.url}
          muted
          loop
          playsInline
          preload="none"
          aria-hidden="true"
          tabIndex={-1}
          onTimeUpdate={(event) => {
            const el = event.currentTarget;
            setProgress(el.duration ? el.currentTime / el.duration : 0);
          }}
        />
        {!playing && (
          <span className={styles.playHint} aria-hidden="true">
            <Play size={16} fill="currentColor" />
          </span>
        )}
      </button>
      <span className={styles.badges} aria-hidden="true">
        <span>{item.duration}s</span>
        {item.audio && (
          <span>
            <AudioLines size={10} />
          </span>
        )}
        <span className={styles.sample}>Sample</span>
      </span>
      <button
        type="button"
        className={`${styles.favorite} ${item.favorite ? styles.isFavorite : ""}`}
        onClick={onFavorite}
        aria-pressed={item.favorite}
        aria-label={item.favorite ? "Remove from favorites" : "Add to favorites"}
      >
        <Heart size={15} fill={item.favorite ? "currentColor" : "none"} aria-hidden="true" />
      </button>
      <span className={styles.actions}>
        <button type="button" onClick={onUseFrame} title="Animate from this shot">
          <ImagePlus size={13} aria-hidden="true" />
          Use as start frame
        </button>
        <a href={item.url} download={downloadName(item)} aria-label="Download sample video" title="Download">
          <ArrowDownToLine size={14} aria-hidden="true" />
        </a>
      </span>
      <span className={styles.scrub} style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />
    </article>
  );
}

function stageFor(progress: number) {
  return [...renderStages].reverse().find((stage) => progress >= stage.at)?.label ?? renderStages[0].label;
}

/** A live placeholder at the final shape, previewing the chosen camera move while it renders. */
export function RenderCard({
  job,
  index,
  frame,
  motionEnabled,
  onCancel,
}: {
  job: RenderJob;
  index: number;
  frame?: string;
  motionEnabled: boolean;
  onCancel?: () => void;
}) {
  const [now, setNow] = useState(() => job.startedAt);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 120);
    return () => window.clearInterval(timer);
  }, []);
  // Ease out so the bar feels quick at first and patient near the end; hold at 99% until revealed.
  const linear = Math.min(1, Math.max(0, (now - job.startedAt) / job.eta));
  const progress = Math.min(0.99, 1 - Math.pow(1 - linear, 1.6));
  const remaining = Math.max(0, Math.ceil((job.eta - (now - job.startedAt)) / 1000));
  const preset = motionPresets.find((item) => item.id === job.motion) ?? motionPresets[0];

  return (
    <div
      className={`${styles.card} ${styles.renderCard}`}
      style={{ ...ratioStyle(job.aspectRatio), "--delay": `${index * 70}ms` } as CSSProperties}
    >
      {frame ? (
        <span
          className={`${motion.stage} ${motionEnabled ? motion.playing : ""} ${styles.renderFrame}`}
          data-motion={preset.id}
          aria-hidden="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={frame} alt="" className={motion.layer} />
        </span>
      ) : (
        <span className={styles.renderMesh} aria-hidden="true" />
      )}
      <span className={styles.renderShimmer} aria-hidden="true" />
      <span
        className={styles.renderInfo}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        aria-valuetext={`${stageFor(progress)}, ${Math.round(progress * 100)}%`}
        aria-label={`Rendering video ${index + 1} of ${job.count}`}
      >
        <span className={styles.renderStage}>{stageFor(progress)}</span>
        <span className={styles.renderPercent}>
          {Math.round(progress * 100)}
          <small>%</small>
        </span>
        <span className={styles.renderMeta}>
          {remaining > 0 ? `About ${remaining}s left` : "Almost there"} ·{" "}
          {preset.id === "auto" ? "Auto camera" : preset.name}
        </span>
      </span>
      <span className={styles.renderBar} aria-hidden="true">
        <span style={{ transform: `scaleX(${progress})` }} />
      </span>
      {onCancel && (
        <button type="button" className={styles.renderCancel} onClick={onCancel} aria-label="Cancel this render">
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export function FailedCard({
  job,
  onRetry,
  onDismiss,
}: {
  job: RenderJob;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className={`${styles.card} ${styles.failedCard}`} style={ratioStyle(job.aspectRatio)} role="alert">
      <TriangleAlert size={22} aria-hidden="true" />
      <strong>This render didn’t come through.</strong>
      <p>{job.error ?? "Something interrupted the preview."} Nothing was charged.</p>
      <span>
        <button type="button" onClick={onRetry}>
          <RotateCcw size={13} aria-hidden="true" />
          Try again
        </button>
        <button type="button" onClick={onDismiss}>
          Dismiss
        </button>
      </span>
    </div>
  );
}
