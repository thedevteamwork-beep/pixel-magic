"use client";

import { ArrowDownToLine, Camera, ChevronLeft, ChevronRight, Copy, Heart, Keyboard, Maximize, MonitorUp, Pause, Play, Repeat, StepBack, StepForward, Trash2, Undo2, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { motionPresets } from "@/constants/video-generator";
import { Modal } from "@/components/landing/Modal";
import { captureVideoFrame } from "@/lib/video-generator/frames";
import { formatTimecode, getVideoModel, ratioValue } from "@/lib/video-generator/settings";
import type { FrameImage, VideoResult } from "@/types/video-generator";
import { downloadName } from "./FeedCards";
import styles from "./VideoViewer.module.css";

const FRAME = 1 / 24;
const rates = [0.5, 1, 1.5, 2] as const;
const modeLabels = { text: "Text to video", image: "Image to video", frames: "Start & end frames" } as const;

type VideoViewerProps = {
  items: readonly VideoResult[];
  activeId: string | null;
  autoplay: boolean;
  onNavigate: (id: string) => void;
  onClose: () => void;
  onFavorite: (id: string) => void;
  onReuse: (item: VideoResult) => void;
  onUpscale: (item: VideoResult) => void;
  onAnimateFrame: (frame: FrameImage) => void;
  onDelete: (id: string) => void;
  onCopy: (text: string, label: string) => void;
  onError: (message: string) => void;
};

export function VideoViewer(props: VideoViewerProps) {
  const { items, activeId } = props;
  const index = items.findIndex((item) => item.id === activeId);
  const item = index >= 0 ? items[index] : null;
  return <Modal open={Boolean(item)} onClose={props.onClose} title={item ? `Video ${index + 1} of ${items.length}` : "Video"} className={styles.dialog}>
    {item && <Player key={item.id} {...props} item={item} index={index} />}
  </Modal>;
}

function Player({ item, index, items, autoplay, onNavigate, onFavorite, onReuse, onUpscale, onAnimateFrame, onDelete, onCopy, onError, onClose }: VideoViewerProps & { item: VideoResult; index: number }) {
  const video = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(true);
  const [loop, setLoop] = useState(true);
  const [rate, setRate] = useState<(typeof rates)[number]>(1);
  const [capturing, setCapturing] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const model = getVideoModel(item.model);
  const preset = motionPresets.find((entry) => entry.id === item.motion);
  const previous = items[index - 1];
  const next = items[index + 1];
  const canUpscale = item.resolution !== "1080p" && model.resolutions.includes("1080p");

  useEffect(() => {
    const element = video.current;
    if (element && autoplay) element.play().catch(() => {});
  }, [autoplay]);

  useEffect(() => { if (video.current) video.current.playbackRate = rate; }, [rate]);

  function toggle() {
    const element = video.current;
    if (!element) return;
    if (element.paused) element.play().catch(() => {});
    else element.pause();
  }
  function seek(to: number) {
    const element = video.current;
    if (!element || !Number.isFinite(element.duration)) return;
    element.currentTime = Math.min(element.duration, Math.max(0, to));
    setTime(element.currentTime);
  }
  function step(direction: 1 | -1) {
    video.current?.pause();
    seek((video.current?.currentTime ?? 0) + direction * FRAME);
  }
  function fullscreen() {
    const element = frameRef.current;
    if (!element) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else element.requestFullscreen?.().catch(() => {});
  }
  async function animateFromFrame() {
    const element = video.current;
    if (!element || capturing) return;
    element.pause();
    setCapturing(true);
    try {
      const frame = await captureVideoFrame(element, `Frame at ${formatTimecode(element.currentTime)}`);
      onAnimateFrame(frame);
    } catch (error) {
      onError(error instanceof Error ? error.message : "That frame couldn’t be captured.");
    } finally { setCapturing(false); }
  }

  function keys(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("input, textarea, select") || event.metaKey || event.ctrlKey || event.altKey) return;
    // Space on a focused button should activate the button, not the player.
    if ((event.key === " " && target.closest("button, a"))) return;
    const handlers: Record<string, () => void> = {
      " ": toggle, k: toggle,
      ArrowLeft: () => seek((video.current?.currentTime ?? 0) - 1), j: () => seek((video.current?.currentTime ?? 0) - 1),
      ArrowRight: () => seek((video.current?.currentTime ?? 0) + 1), l: () => seek((video.current?.currentTime ?? 0) + 1),
      ",": () => step(-1), ".": () => step(1),
      m: () => setMuted((value) => !value), f: fullscreen,
      "[": () => previous && onNavigate(previous.id), "]": () => next && onNavigate(next.id),
    };
    const handler = handlers[event.key.length === 1 ? event.key.toLowerCase() : event.key];
    if (!handler) return;
    event.preventDefault();
    handler();
  }

  const progress = duration ? time / duration : 0;
  return <div className={styles.layout} onKeyDown={keys}>
    <div className={styles.stage}>
      <div ref={frameRef} className={styles.frame} style={{ "--ratio": ratioValue(item.aspectRatio) } as CSSProperties}>
        <video ref={video} src={item.url} poster={item.poster} muted={muted} loop={loop} playsInline preload="auto" aria-label={item.alt}
          onClick={toggle} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)} onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)} />
        {!playing && <button type="button" className={styles.bigPlay} onClick={toggle} aria-label="Play video"><Play size={26} fill="currentColor" aria-hidden="true" /></button>}
        <span className={styles.sampleTag}>Sample preview</span>
        {previous && <button type="button" className={`${styles.nav} ${styles.prev}`} onClick={() => onNavigate(previous.id)} aria-label="Previous video"><ChevronLeft size={20} aria-hidden="true" /></button>}
        {next && <button type="button" className={`${styles.nav} ${styles.next}`} onClick={() => onNavigate(next.id)} aria-label="Next video"><ChevronRight size={20} aria-hidden="true" /></button>}
      </div>

      <div className={styles.controls}>
        <input type="range" className={styles.scrubber} min={0} max={duration || 0} step={0.01} value={time} aria-label="Seek"
          aria-valuetext={`${formatTimecode(time)} of ${formatTimecode(duration)}`} style={{ "--fill": `${progress * 100}%` } as CSSProperties}
          onChange={(event) => seek(Number(event.target.value))} />
        <div className={styles.controlRow}>
          <button type="button" onClick={toggle} aria-label={playing ? "Pause" : "Play"} title={playing ? "Pause (K)" : "Play (K)"}>{playing ? <Pause size={17} fill="currentColor" aria-hidden="true" /> : <Play size={17} fill="currentColor" aria-hidden="true" />}</button>
          <button type="button" onClick={() => step(-1)} aria-label="Previous frame" title="Previous frame (,)"><StepBack size={16} aria-hidden="true" /></button>
          <button type="button" onClick={() => step(1)} aria-label="Next frame" title="Next frame (.)"><StepForward size={16} aria-hidden="true" /></button>
          <span className={styles.time}>{formatTimecode(time)}<span> / {formatTimecode(duration)}</span></span>
          <span className={styles.spacer} />
          <button type="button" className={styles.rate} onClick={() => setRate(rates[(rates.indexOf(rate) + 1) % rates.length])} aria-label={`Playback speed ${rate}×`} title="Playback speed">{rate}×</button>
          <button type="button" onClick={() => setLoop((value) => !value)} aria-pressed={loop} aria-label="Loop" title="Loop"><Repeat size={16} aria-hidden="true" /></button>
          <button type="button" onClick={() => setMuted((value) => !value)} aria-pressed={!muted} aria-label={muted ? "Unmute" : "Mute"} title={muted ? "Unmute (M)" : "Mute (M)"}>{muted ? <VolumeX size={16} aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />}</button>
          <button type="button" onClick={fullscreen} aria-label="Full screen" title="Full screen (F)"><Maximize size={16} aria-hidden="true" /></button>
        </div>
      </div>
    </div>

    <aside className={styles.details}>
      <div className={styles.detailsTop}>
        <span className={styles.modelBadge}><span aria-hidden="true">{model.symbol}</span>{model.name}</span>
        <button type="button" className={`${styles.iconButton} ${item.favorite ? styles.isFavorite : ""}`} onClick={() => onFavorite(item.id)} aria-pressed={item.favorite} aria-label={item.favorite ? "Remove from favorites" : "Add to favorites"}>
          <Heart size={16} fill={item.favorite ? "currentColor" : "none"} aria-hidden="true" />
        </button>
      </div>

      <button type="button" className={styles.primary} onClick={animateFromFrame} disabled={capturing}>
        <Camera size={15} aria-hidden="true" />{capturing ? "Capturing…" : `Animate from ${time > 0.05 ? formatTimecode(time) : "this frame"}`}
      </button>
      <p className={styles.hint}>Pause on any moment, then use it as the start frame of your next shot.</p>

      <div className={styles.block}>
        <div className={styles.blockHead}><h3>Prompt</h3>{item.prompt && <button type="button" onClick={() => onCopy(item.prompt, "Prompt")}><Copy size={12} aria-hidden="true" />Copy</button>}</div>
        <p className={styles.prompt} tabIndex={0}>{item.prompt || "Animated from a start frame, without a written prompt."}</p>
      </div>

      <dl className={styles.meta}>
        <div><dt>Mode</dt><dd>{modeLabels[item.mode]}</dd></div>
        <div><dt>Duration</dt><dd>{item.duration}s</dd></div>
        <div><dt>Aspect ratio</dt><dd>{item.aspectRatio}</dd></div>
        <div><dt>Resolution</dt><dd>{item.resolution}</dd></div>
        <div><dt>Camera</dt><dd>{preset?.name ?? "Auto"}</dd></div>
        <div><dt>Sound</dt><dd>{item.audio ? "On" : "Off"}</dd></div>
        <div className={styles.seed}><dt>Seed</dt><dd><button type="button" onClick={() => onCopy(String(item.seed), "Seed")} title="Copy seed">{item.seed}<Copy size={11} aria-hidden="true" /></button></dd></div>
      </dl>

      <div className={styles.actions}>
        <button type="button" onClick={() => { onReuse(item); onClose(); }}><Undo2 size={14} aria-hidden="true" />Reuse settings</button>
        {canUpscale && <button type="button" onClick={() => { onUpscale(item); onClose(); }}><MonitorUp size={14} aria-hidden="true" />Render in 1080p</button>}
        <a href={item.url} download={downloadName(item)}><ArrowDownToLine size={14} aria-hidden="true" />Download</a>
        <button type="button" className={styles.danger} onClick={() => onDelete(item.id)}><Trash2 size={14} aria-hidden="true" />Delete</button>
      </div>

      <button type="button" className={styles.shortcutToggle} aria-expanded={shortcuts} onClick={() => setShortcuts((value) => !value)}><Keyboard size={13} aria-hidden="true" />Keyboard shortcuts</button>
      {shortcuts && <dl className={styles.shortcuts}>
        <div><dt><kbd>Space</kbd> <kbd>K</kbd></dt><dd>Play / pause</dd></div>
        <div><dt><kbd>←</kbd> <kbd>→</kbd></dt><dd>Back / forward 1s</dd></div>
        <div><dt><kbd>,</kbd> <kbd>.</kbd></dt><dd>Step one frame</dd></div>
        <div><dt><kbd>[</kbd> <kbd>]</kbd></dt><dd>Previous / next video</dd></div>
        <div><dt><kbd>M</kbd> <kbd>F</kbd></dt><dd>Mute · full screen</dd></div>
      </dl>}
      <p className={styles.note}>This is a pre-existing sample clip shown with your prompt and settings. It is not AI generated and no credits were used.</p>
    </aside>
  </div>;
}
