"use client";

import { ArrowDownLeft, CircleHelp, Heart, Info, LoaderCircle, RotateCcw, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { defaultVideoSettings, MAX_VIDEO_PROMPT_LENGTH, motionPresets, videoInspirations } from "@/constants/video-generator";
import { Modal } from "@/components/landing/Modal";
import { useLandingMotion } from "@/components/landing/LandingProvider";
import { requestVideoPreview, VideoPreviewError } from "@/lib/video-generator/client";
import { FrameError, loadFrameFile, loadSampleFrame } from "@/lib/video-generator/frames";
import { closestAspectRatio, composeVideoPrompt, fitSettingsToModel, getVideoModel, previewRenderMs } from "@/lib/video-generator/settings";
import type { FrameImage, FrameSlot, RenderJob, VideoGenerationRequest, VideoMode, VideoResult, VideoSettings } from "@/types/video-generator";
import { DirectorPanel, MAX_ACTIVE_RENDERS } from "./DirectorPanel";
import { VideoFeed } from "./VideoFeed";
import { VideoViewer } from "./VideoViewer";
import { VideoWelcome } from "./VideoWelcome";
import styles from "./VideoWorkspace.module.css";

type Toast = { id: number; text: string; action?: { label: string; run: () => void }; tone?: "success" | "info" };
type Frames = Record<FrameSlot, FrameImage | null>;
/** What a render needs to be retried or re-rendered at a higher resolution. */
type Snapshot = { request: VideoGenerationRequest; prompt: string; frameUrl?: string };
type RowSize = "s" | "m" | "l";
const rowHeights: Record<RowSize, string> = { s: "190px", m: "280px", l: "400px" };
const MAX_ITEMS = 60;

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); }, { once: true });
  });
}

function initialSettings(model: string, preset: string | null): VideoSettings {
  const inspiration = videoInspirations.find((item) => item.id === preset);
  const base: VideoSettings = { ...defaultVideoSettings, model };
  if (!inspiration) return fitSettingsToModel(base).settings;
  return fitSettingsToModel({ ...base, prompt: inspiration.prompt, motion: inspiration.motion, aspectRatio: inspiration.aspectRatio, duration: inspiration.duration }).settings;
}

export function VideoWorkspace({ initialModel, initialPreset }: { initialModel: string; initialPreset: string | null }) {
  const { motionEnabled } = useLandingMotion();
  const [settings, setSettings] = useState<VideoSettings>(() => initialSettings(initialModel, initialPreset));
  const [frames, setFrames] = useState<Frames>({ start: null, end: null });
  const [frameBusy, setFrameBusy] = useState<FrameSlot | null>(null);
  const [frameError, setFrameError] = useState("");
  const [items, setItems] = useState<VideoResult[]>([]);
  const [jobs, setJobs] = useState<RenderJob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "favorites">("all");
  const [rowSize, setRowSize] = useState<RowSize>("m");
  const [toast, setToast] = useState<Toast | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const formWrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const controllers = useRef(new Map<string, AbortController>());
  const snapshots = useRef(new Map<string, Snapshot>());
  const ownedUrls = useRef(new Set<string>());
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const model = getVideoModel(settings.model);

  const notify = useCallback((text: string, action?: Toast["action"], tone: Toast["tone"] = "info") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), text, action, tone });
    toastTimer.current = setTimeout(() => setToast(null), action ? 8000 : 4500);
  }, []);

  // Revoke local object URLs once neither a frame slot nor a running job shows them.
  useEffect(() => {
    const active = new Set([frames.start?.url, frames.end?.url, ...jobs.map((job) => job.frameUrl)].filter(Boolean));
    for (const url of ownedUrls.current) if (!active.has(url)) { URL.revokeObjectURL(url); ownedUrls.current.delete(url); }
  }, [frames, jobs]);

  useEffect(() => {
    const owned = ownedUrls.current;
    const running = controllers.current;
    return () => {
      for (const controller of running.values()) controller.abort();
      for (const url of owned) URL.revokeObjectURL(url);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  function focusPrompt() {
    requestAnimationFrame(() => {
      const prompt = promptRef.current;
      if (!prompt) return;
      prompt.focus({ preventScroll: false });
      prompt.setSelectionRange(prompt.value.length, prompt.value.length);
    });
  }

  function update(patch: Partial<VideoSettings>) {
    setSettings((current) => ({ ...current, ...patch }));
    setError(null);
  }

  function changeModel(id: string) {
    const { settings: next, adjustments } = fitSettingsToModel(settings, getVideoModel(id));
    setSettings(next);
    const name = getVideoModel(id).name;
    if (adjustments.length) notify(`Switched to ${name}. Adjusted to fit: ${adjustments.join(", ")}.`);
  }

  function changeMode(mode: VideoMode) {
    update({ mode });
    setFrameError("");
  }

  function setFrame(slot: FrameSlot, frame: FrameImage | null) {
    if (frame && frame.url.startsWith("blob:")) ownedUrls.current.add(frame.url);
    setFrames((current) => ({ ...current, [slot]: frame }));
  }

  /** The first start frame sets the shape of the shot, with a one-tap undo. */
  function matchFrameShape(frame: FrameImage) {
    const ratio = closestAspectRatio(frame.width, frame.height, model.aspectRatios);
    if (ratio === settings.aspectRatio) return;
    const previous = settings.aspectRatio;
    update({ aspectRatio: ratio });
    notify(`Aspect ratio set to ${ratio} to match your frame.`, { label: "Undo", run: () => update({ aspectRatio: previous }) });
  }

  async function addFrameFiles(slot: FrameSlot, files: readonly File[]) {
    const file = files.find((item) => item.type.startsWith("image/")) ?? files[0];
    if (!file || frameBusy) return;
    setFrameBusy(slot);
    setFrameError("");
    try {
      const frame = await loadFrameFile(file);
      ownedUrls.current.add(frame.url);
      const firstStart = slot === "start" && !frames.start;
      setFrame(slot, frame);
      if (settings.mode === "text") update({ mode: "image" });
      if (firstStart) matchFrameShape(frame);
    } catch (caught) {
      setFrameError(caught instanceof FrameError ? caught.message : "That image couldn’t be added. Please try another.");
    } finally { setFrameBusy(null); }
  }

  function applyStartFrame(frame: FrameImage, message: string) {
    setFrame("start", frame);
    if (settings.mode === "text") update({ mode: "image" });
    setViewerId(null);
    notify(message, undefined, "success");
    formWrapRef.current?.scrollIntoView({ block: "start", behavior: motionEnabled ? "smooth" : "instant" });
    focusPrompt();
  }

  async function startFromResult(item: VideoResult) {
    try {
      const frame = await loadSampleFrame(item.poster, "Frame from your video");
      applyStartFrame(frame, "Start frame set. Describe how the scene should move next.");
    } catch { notify("That frame couldn’t be added. Please try again."); }
  }

  function swapFrames() {
    setFrames((current) => ({ start: current.end, end: current.start }));
  }

  function applyInspiration(id: string, message?: string) {
    const inspiration = videoInspirations.find((item) => item.id === id);
    if (!inspiration) return;
    const { settings: next } = fitSettingsToModel({ ...settings, mode: "text", prompt: inspiration.prompt, motion: inspiration.motion, aspectRatio: inspiration.aspectRatio, duration: inspiration.duration });
    setSettings(next);
    setError(null);
    notify(message ?? `“${inspiration.title}” is loaded. Make it yours, then generate.`);
    focusPrompt();
  }

  function surprise() {
    const options = videoInspirations.filter((item) => item.prompt !== settings.prompt);
    const pick = options[Math.floor(Math.random() * options.length)];
    applyInspiration(pick.id, `Here’s an idea: “${pick.title}”.`);
  }

  function selectMotion(id: string) {
    update({ motion: id });
    notify(`${motionPresets.find((preset) => preset.id === id)?.name} added to your shot.`);
    focusPrompt();
  }

  const startRender = useCallback((snapshot: Snapshot) => {
    const { request, prompt, frameUrl } = snapshot;
    const id = `job-${crypto.randomUUID()}`;
    const job: RenderJob = {
      id, prompt, model: request.model, aspectRatio: request.aspectRatio, duration: request.duration, resolution: request.resolution,
      count: request.count, motion: request.motion, startedAt: Date.now(),
      eta: previewRenderMs(request) + Math.round(Math.random() * 800), frameUrl, status: "rendering",
    };
    const controller = new AbortController();
    controllers.current.set(id, controller);
    snapshots.current.set(id, snapshot);
    setJobs((current) => [job, ...current]);
    setAnnouncement(`Rendering ${request.count === 1 ? "a sample video" : `${request.count} sample videos`}. You can keep working.`);

    Promise.all([requestVideoPreview(request, controller.signal), wait(job.eta, controller.signal)]).then(([response]) => {
      const videos = response.videos.map((video) => ({ ...video, prompt }));
      snapshots.current.set(response.id, snapshot);
      setJobs((current) => current.filter((entry) => entry.id !== id));
      setItems((current) => [...videos, ...current].slice(0, MAX_ITEMS));
      setFilter("all");
      const text = `${videos.length === 1 ? "Your video is" : `${videos.length} videos are`} ready. No credits were used.`;
      setAnnouncement(text);
      notify(text, { label: "Watch", run: () => setViewerId(videos[0].id) }, "success");
    }).catch((caught: unknown) => {
      if (controller.signal.aborted) return;
      const message = caught instanceof VideoPreviewError ? caught.message : "Something interrupted the preview.";
      setJobs((current) => current.map((entry) => entry.id === id ? { ...entry, status: "failed", error: message } : entry));
      setAnnouncement(`A render failed. ${message}`);
    }).finally(() => { controllers.current.delete(id); });
  }, [notify]);

  function generate(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (jobs.filter((job) => job.status === "rendering").length >= MAX_ACTIVE_RENDERS) {
      notify(`Up to ${MAX_ACTIVE_RENDERS} videos can render at once. One will finish soon.`);
      return;
    }
    const fitted = fitSettingsToModel(settings).settings;
    if (fitted.mode === "text" && !fitted.prompt.trim()) { setError("Describe your scene in a few words first, or switch to Image to animate a still."); promptRef.current?.focus(); return; }
    if (fitted.mode !== "text" && !frames.start) { setFrameError("Add a start frame to animate."); return; }
    if (fitted.mode === "frames" && !frames.end) { setFrameError("Add an end frame for the shot to land on."); return; }
    const composed = composeVideoPrompt(fitted.prompt, fitted.motion, fitted.motionStrength);
    if (composed.length > MAX_VIDEO_PROMPT_LENGTH) { setError("Your prompt and camera direction are a little long together. Shorten the prompt slightly."); promptRef.current?.focus(); return; }
    const descriptor = (frame: FrameImage | null) => frame ? { id: frame.id, mimeType: frame.mimeType, size: frame.size } : null;
    const request: VideoGenerationRequest = {
      ...fitted, prompt: composed,
      frames: { start: fitted.mode === "text" ? null : descriptor(frames.start), end: fitted.mode === "frames" ? descriptor(frames.end) : null },
    };
    setError(null);
    setFrameError("");
    startRender({ request, prompt: fitted.prompt.trim(), frameUrl: fitted.mode === "text" ? undefined : frames.start?.url });
    if (window.matchMedia("(max-width: 900px)").matches) {
      requestAnimationFrame(() => stageRef.current?.scrollIntoView({ block: "start", behavior: motionEnabled ? "smooth" : "instant" }));
    }
  }

  function cancelJob(id: string) {
    controllers.current.get(id)?.abort();
    controllers.current.delete(id);
    setJobs((current) => current.filter((job) => job.id !== id));
    setAnnouncement("Render canceled.");
    notify("Render canceled. Nothing was charged.");
  }

  function retryJob(id: string) {
    const snapshot = snapshots.current.get(id);
    setJobs((current) => current.filter((job) => job.id !== id));
    if (snapshot) startRender({ ...snapshot, frameUrl: snapshot.frameUrl?.startsWith("blob:") && !ownedUrls.current.has(snapshot.frameUrl) ? undefined : snapshot.frameUrl });
  }

  function reuse(item: VideoResult) {
    const keepFrames = item.mode !== "text" && Boolean(frames.start) && (item.mode !== "frames" || Boolean(frames.end));
    const { settings: next } = fitSettingsToModel({
      ...settings, model: item.model, prompt: item.prompt, mode: keepFrames ? item.mode : "text", aspectRatio: item.aspectRatio,
      resolution: item.resolution, duration: item.duration, motion: item.motion, audio: item.audio, seed: item.seed,
    });
    setSettings(next);
    setError(null);
    notify(`Settings restored, with seed ${item.seed} locked for a similar result.`, { label: "Unlock seed", run: () => update({ seed: null }) });
    formWrapRef.current?.scrollIntoView({ block: "start", behavior: motionEnabled ? "smooth" : "instant" });
    focusPrompt();
  }

  function upscale(item: VideoResult) {
    const snapshot = snapshots.current.get(item.batchId);
    if (!snapshot) { reuse(item); update({ resolution: "1080p" }); return; }
    startRender({ request: { ...snapshot.request, resolution: "1080p", count: 1, seed: item.seed }, prompt: snapshot.prompt, frameUrl: item.poster });
    notify("Rendering this shot again in 1080p.");
  }

  function remove(ids: ReadonlySet<string>, label: string) {
    const removed = items.filter((item) => ids.has(item.id));
    if (!removed.length) return;
    setItems((current) => current.filter((item) => !ids.has(item.id)));
    if (viewerId && ids.has(viewerId)) setViewerId(null);
    notify(label, { label: "Undo", run: () => setItems((current) => [...removed, ...current].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, MAX_ITEMS)) });
  }

  function copy(text: string, label: string) {
    navigator.clipboard?.writeText(text).then(() => notify(`${label} copied.`), () => notify(`${label} couldn’t be copied.`));
  }

  // ⌘/Ctrl + Enter generates from anywhere; "/" jumps to the prompt.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (document.querySelector("dialog[open]")) return;
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        formWrapRef.current?.querySelector("form")?.requestSubmit();
      } else if (event.key === "/" && !(event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable]"))) {
        event.preventDefault();
        promptRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function pasteFrame(files: readonly File[]) {
    const images = files.filter((file) => file.type.startsWith("image/"));
    if (!images.length) return false;
    const slot: FrameSlot = settings.mode === "frames" && frames.start && !frames.end ? "end" : "start";
    void addFrameFiles(slot, images);
    return true;
  }

  const rendering = jobs.filter((job) => job.status === "rendering").length;
  const favorites = items.filter((item) => item.favorite).length;
  const visible = filter === "favorites" ? items.filter((item) => item.favorite) : items;
  const empty = items.length === 0 && jobs.length === 0;

  return <main className={styles.workspace} id="main-content" tabIndex={-1}
    onPaste={(event) => { if (pasteFrame(Array.from(event.clipboardData.files))) event.preventDefault(); }}>
    <h1 className={styles.srOnly}>Pixel Magic video studio</h1>

    <div ref={formWrapRef} className={styles.panelWrap}>
      <DirectorPanel settings={settings} frames={frames} frameBusy={frameBusy} frameError={frameError} activeRenders={rendering} error={error} promptRef={promptRef}
        onChange={update} onModeChange={changeMode} onModelChange={changeModel} onFrameFiles={(slot, files) => void addFrameFiles(slot, files)}
        onRemoveFrame={(slot) => setFrame(slot, null)} onSwapFrames={swapFrames} onSurprise={surprise} onSubmit={generate} />
    </div>

    <section ref={stageRef} className={styles.stage} aria-label="Your videos" aria-busy={rendering > 0}
      style={{ "--feed-row-height": rowHeights[rowSize] } as CSSProperties}
      onDragOver={(event) => { if (event.dataTransfer.types.includes("Files")) event.preventDefault(); }}
      onDrop={(event) => { if (pasteFrame(Array.from(event.dataTransfer.files))) event.preventDefault(); }}>
      <div className={styles.toolbar}>
        <div className={styles.tabs} role="group" aria-label="Filter videos">
          <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>All<span>{items.length}</span></button>
          <button type="button" aria-pressed={filter === "favorites"} onClick={() => setFilter("favorites")}><Heart size={12} aria-hidden="true" />Favorites<span>{favorites}</span></button>
        </div>
        <div className={styles.toolbarEnd}>
          {rendering > 0 && <span className={styles.renderingPill}><LoaderCircle size={12} className={styles.spinner} aria-hidden="true" />{rendering} rendering</span>}
          {!empty && <div className={styles.sizes} role="group" aria-label="Thumbnail size">
            {(["s", "m", "l"] as const).map((size) => <button type="button" key={size} aria-pressed={rowSize === size} onClick={() => setRowSize(size)} aria-label={{ s: "Small", m: "Medium", l: "Large" }[size]}>
              <span data-size={size} aria-hidden="true" />
            </button>)}
          </div>}
          <button type="button" className={styles.help} onClick={() => setHelpOpen(true)} aria-label="How the video studio works"><CircleHelp size={17} aria-hidden="true" /></button>
        </div>
      </div>

      <div className={styles.content}>
        {empty ? <VideoWelcome autoplay={motionEnabled} onSelectInspiration={(id) => applyInspiration(id)} onSelectMotion={selectMotion}
          onStartFromImage={() => { changeMode("image"); formWrapRef.current?.scrollIntoView({ block: "start", behavior: motionEnabled ? "smooth" : "instant" }); }} />
          : filter === "favorites" && !visible.length ? <div className={styles.emptyFavorites}>
            <Heart size={26} strokeWidth={1.4} aria-hidden="true" />
            <h2>Keep the takes you love.</h2>
            <p>Tap the heart on any video to collect it here.</p>
            <button type="button" onClick={() => setFilter("all")}>Show all videos</button>
          </div>
          : <VideoFeed items={visible} jobs={filter === "all" ? jobs : []} motionEnabled={motionEnabled}
            onOpen={setViewerId} onFavorite={(id) => setItems((current) => current.map((item) => item.id === id ? { ...item, favorite: !item.favorite } : item))}
            onUseFrame={(item) => void startFromResult(item)} onReuse={reuse} onUpscale={upscale} onCopyPrompt={(prompt) => copy(prompt, "Prompt")}
            onDeleteBatch={(batchId) => { const ids = new Set(items.filter((item) => item.batchId === batchId).map((item) => item.id)); remove(ids, ids.size === 1 ? "Video deleted." : `${ids.size} videos deleted.`); }}
            onCancel={cancelJob} onRetry={retryJob} onDismiss={(id) => setJobs((current) => current.filter((job) => job.id !== id))} />}
      </div>

      {toast && <div key={toast.id} className={styles.toast} data-tone={toast.tone} role="status">
        {toast.tone === "success" ? <Sparkles size={15} aria-hidden="true" /> : <Info size={15} aria-hidden="true" />}
        <span>{toast.text}</span>
        {toast.action && <button type="button" className={styles.toastAction} onClick={() => { toast.action?.run(); setToast(null); }}>{toast.action.label === "Undo" && <RotateCcw size={12} aria-hidden="true" />}{toast.action.label}</button>}
        <button type="button" className={styles.toastClose} onClick={() => setToast(null)} aria-label="Dismiss notification"><X size={14} aria-hidden="true" /></button>
      </div>}
    </section>

    <VideoViewer items={visible} activeId={viewerId} autoplay={motionEnabled} onNavigate={setViewerId} onClose={() => setViewerId(null)}
      onFavorite={(id) => setItems((current) => current.map((item) => item.id === id ? { ...item, favorite: !item.favorite } : item))}
      onReuse={reuse} onUpscale={upscale} onAnimateFrame={(frame) => applyStartFrame(frame, "Frame captured. Describe what happens next.")}
      onDelete={(id) => remove(new Set([id]), "Video deleted.")} onCopy={copy} onError={(message) => notify(message)} />

    <p className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">{announcement}</p>

    <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title="How the video studio works" className={styles.helpModal}>
      <div className={styles.helpContent}>
        <span className={styles.helpMark}><Sparkles size={24} aria-hidden="true" /></span>
        <h2>From a single frame<br />to a <em>moving story.</em></h2>
        <ol>
          <li><span>01</span><div><strong>Start with words or a still.</strong><p>Write a scene, or switch to Image to animate a start frame. Frames lets you choose where the shot lands, too.</p></div></li>
          <li><span>02</span><div><strong>Direct the camera.</strong><p>Pick a camera move and its intensity, then choose the model, length, shape, resolution and sound. Settings adapt to what each model supports.</p></div></li>
          <li><span>03</span><div><strong>Render, compare, refine.</strong><p>Up to {MAX_ACTIVE_RENDERS} renders run at once while you keep working. Reuse settings, pause on a moment to animate from it, or render a favorite in 1080p.</p></div></li>
        </ol>
        <div className={styles.helpKeys}><span><kbd>⌘</kbd><kbd>↵</kbd> Generate</span><span><kbd>/</kbd> Focus prompt</span><span><kbd>⌘</kbd><kbd>V</kbd> Paste a frame</span></div>
        <div className={styles.helpNotice}><Info size={16} aria-hidden="true" /><p>This is a design preview. Results are pre-existing sample clips, not AI-generated video, and no credits are charged. Credit and time estimates are indicative. Frames stay in this browser.</p></div>
        <button type="button" className="button-primary" onClick={() => { setHelpOpen(false); focusPrompt(); }}>Start directing <ArrowDownLeft size={16} aria-hidden="true" /></button>
      </div>
    </Modal>
  </main>;
}
