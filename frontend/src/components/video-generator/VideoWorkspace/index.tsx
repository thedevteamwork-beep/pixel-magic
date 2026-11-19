"use client";

import { ArrowDownLeft, CircleHelp, Heart, Info, LoaderCircle, RotateCcw, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { defaultVideoSettings, MAX_ACTIVE_RENDERS, videoInspirations } from "@/components/video-generator/constants";
import { Modal } from "@/ui/Modal";
import { useLandingMotion } from "@/components/landing/LandingProvider";
import { requestVideoPreview, VideoPreviewError } from "@/lib/video-generator/client";
import { useIncomingImage } from "@/lib/handoff/useIncomingImage";
import { FrameError, loadClipFile, loadFrameFile, loadSampleFrame } from "@/lib/video-generator/frames";
import {
  closestAspectRatio,
  effectiveDuration,
  fitSettingsToModel,
  getVideoModel,
  modeName,
  modelsForMode,
  previewRenderMs,
} from "@/lib/video-generator/settings";
import type {
  FrameImage,
  RenderJob,
  VideoGenerationRequest,
  VideoInputs,
  VideoMode,
  VideoResult,
  VideoSettings,
} from "@/types/video-generator";
import { DirectorPanel } from "../DirectorPanel";
import type { InputTarget } from "../InputsSection";
import { VideoFeed } from "../VideoFeed";
import { VideoViewer } from "../VideoViewer";
import { VideoWelcome } from "../VideoWelcome";
import styles from "./main.module.css";

type Toast = { id: number; text: string; action?: { label: string; run: () => void }; tone?: "success" | "info" };
/** What a render needs to be retried or re-rendered at a higher resolution. */
type Snapshot = { request: VideoGenerationRequest; prompt: string; frameUrl?: string };
type RowSize = "s" | "m" | "l";
const rowHeights: Record<RowSize, string> = { s: "190px", m: "280px", l: "400px" };
const MAX_ITEMS = 60;
const emptyInputs: VideoInputs = { start: null, end: null, references: [], clip: null };

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

function initialSettings(model: string, preset: string | null): VideoSettings {
  const inspiration = videoInspirations.find((item) => item.id === preset);
  const base: VideoSettings = { ...defaultVideoSettings, model };
  if (!inspiration) return fitSettingsToModel(base).settings;
  return fitSettingsToModel({
    ...base,
    prompt: inspiration.prompt,
    aspectRatio: inspiration.aspectRatio,
    duration: inspiration.duration,
  }).settings;
}

const descriptor = (frame: FrameImage) => ({ id: frame.id, mimeType: frame.mimeType, size: frame.size });

export function VideoWorkspace({
  initialModel,
  initialPreset,
}: {
  initialModel: string;
  initialPreset: string | null;
}) {
  const { motionEnabled } = useLandingMotion();
  const [settings, setSettings] = useState<VideoSettings>(() => initialSettings(initialModel, initialPreset));
  const [inputs, setInputs] = useState<VideoInputs>(emptyInputs);
  const [inputBusy, setInputBusy] = useState<InputTarget | null>(null);
  const [inputError, setInputError] = useState("");
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
  // Async uploads finish after renders; read the latest settings and inputs, not a stale closure.
  const latest = useRef({ settings, inputs });
  useEffect(() => {
    latest.current = { settings, inputs };
  });
  const model = getVideoModel(settings.model);

  const notify = useCallback((text: string, action?: Toast["action"], tone: Toast["tone"] = "info") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), text, action, tone });
    toastTimer.current = setTimeout(() => setToast(null), action ? 8000 : 4500);
  }, []);

  // Revoke local object URLs once neither an input nor a running job shows them.
  useEffect(() => {
    const active = new Set(
      [
        inputs.start?.url,
        inputs.end?.url,
        inputs.clip?.url,
        ...inputs.references.map((item) => item.url),
        ...jobs.map((job) => job.frameUrl),
      ].filter(Boolean),
    );
    for (const url of ownedUrls.current)
      if (!active.has(url)) {
        URL.revokeObjectURL(url);
        ownedUrls.current.delete(url);
      }
  }, [inputs, jobs]);

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
      prompt.focus();
      prompt.setSelectionRange(prompt.value.length, prompt.value.length);
    });
  }

  function revealPanel() {
    formWrapRef.current?.scrollIntoView({ block: "start", behavior: motionEnabled ? "smooth" : "instant" });
  }

  function update(patch: Partial<VideoSettings>) {
    setSettings((current) => ({ ...current, ...patch }));
    setError(null);
  }

  function changeModel(id: string) {
    const next = getVideoModel(id);
    const { settings: fitted, adjustments } = fitSettingsToModel(latest.current.settings, next);
    setSettings(fitted);
    if (adjustments.length) notify(`Switched to ${next.name}. Adjusted to fit: ${adjustments.join(", ")}.`);
  }

  /** A mode the current model can’t do moves to the best model that can, and says so. */
  function changeMode(mode: VideoMode) {
    const current = latest.current.settings;
    setInputError("");
    setError(null);
    if (getVideoModel(current.model).modes.includes(mode)) {
      setSettings({ ...current, mode });
      return;
    }
    const next = modelsForMode(mode)[0];
    const { settings: fitted, adjustments } = fitSettingsToModel({ ...current, mode }, next);
    setSettings(fitted);
    notify(`${modeName(mode)} uses ${next.name}${adjustments.length ? `. Adjusted: ${adjustments.join(", ")}` : ""}.`);
  }

  function track<T extends { url: string }>(item: T): T {
    if (item.url.startsWith("blob:")) ownedUrls.current.add(item.url);
    return item;
  }

  /** The first image sets the shape of the shot, with a one-tap undo. */
  function matchShape(frame: FrameImage) {
    const current = latest.current.settings;
    const ratio = closestAspectRatio(frame.width, frame.height, getVideoModel(current.model).aspectRatios);
    if (ratio === current.aspectRatio) return;
    const previous = current.aspectRatio;
    update({ aspectRatio: ratio });
    notify(`Aspect ratio set to ${ratio} to match your image.`, {
      label: "Undo",
      run: () => update({ aspectRatio: previous }),
    });
  }

  async function addFiles(target: InputTarget, files: readonly File[]) {
    if (!files.length || inputBusy) return;
    setInputBusy(target);
    setInputError("");
    try {
      if (target === "clip") {
        const file = files.find((item) => item.type.startsWith("video/")) ?? files[0];
        const clip = track(await loadClipFile(file));
        setInputs((current) => ({ ...current, clip }));
      } else if (target === "reference") {
        const limit = getVideoModel(latest.current.settings.model).maxReferences;
        const room = limit - latest.current.inputs.references.length;
        const issues: string[] =
          files.length > room ? [`Only ${room} more ${room === 1 ? "reference fits" : "references fit"}.`] : [];
        const added: FrameImage[] = [];
        for (const file of files.slice(0, Math.max(0, room))) {
          try {
            added.push(track(await loadFrameFile(file)));
          } catch (caught) {
            issues.push(caught instanceof FrameError ? caught.message : `${file.name} couldn’t be added.`);
          }
        }
        if (added.length) setInputs((current) => ({ ...current, references: [...current.references, ...added] }));
        if (issues.length) setInputError(issues.join(" "));
      } else {
        const file = files.find((item) => item.type.startsWith("image/")) ?? files[0];
        const frame = track(await loadFrameFile(file));
        const firstStart = target === "start" && !latest.current.inputs.start;
        setInputs((current) => ({ ...current, [target]: frame }));
        if (firstStart) matchShape(frame);
      }
    } catch (caught) {
      setInputError(caught instanceof FrameError ? caught.message : "That file couldn’t be added. Please try another.");
    } finally {
      setInputBusy(null);
    }
  }

  function removeInput(target: InputTarget, id?: string) {
    setInputs((current) =>
      target === "reference"
        ? { ...current, references: current.references.filter((item) => item.id !== id) }
        : { ...current, [target]: null },
    );
    setInputError("");
  }

  function clearInputs() {
    const mode = latest.current.settings.mode;
    setInputs((current) =>
      mode === "reference"
        ? { ...current, references: [] }
        : mode === "motion"
          ? { ...current, start: null, clip: null }
          : { ...current, start: null, end: null },
    );
    setInputError("");
  }

  /** Route pasted or dropped files to wherever they make sense for the current mode. */
  function routeFiles(files: readonly File[]) {
    const images = files.filter((file) => file.type.startsWith("image/"));
    const clips = files.filter((file) => file.type.startsWith("video/"));
    if (!images.length && !clips.length) return false;
    const { settings: current, inputs: attached } = latest.current;
    if (clips.length) {
      if (current.mode !== "motion") changeMode("motion");
      void addFiles("clip", clips);
      return true;
    }
    if (current.mode === "text") changeMode("image");
    if (current.mode === "reference") void addFiles("reference", images);
    else if (current.mode === "image" && attached.start && !attached.end && getVideoModel(current.model).endFrame)
      void addFiles("end", images);
    else void addFiles("start", images);
    return true;
  }

  // An image sent from another studio ("Animate" on a generated image) becomes the start frame.
  useIncomingImage(
    "video",
    async (file) => {
      try {
        const frame = track(await loadFrameFile(file));
        if (latest.current.settings.mode !== "image") changeMode("image");
        setInputs((current) => ({ ...current, start: frame, end: null }));
        notify("Your image is the start frame. Describe how it should move.", undefined, "success");
        matchShape(frame);
        focusPrompt();
      } catch (caught) {
        setInputError(
          caught instanceof FrameError ? caught.message : "That image couldn’t be added. Please upload it.",
        );
      }
    },
    () => setInputError("That image couldn’t be opened. Please upload it instead."),
  );

  /** A frame from a result or the viewer becomes the next shot’s starting point. */
  function takeFrame(frame: FrameImage, message: string) {
    track(frame);
    const mode = latest.current.settings.mode;
    if (mode === "reference" && latest.current.inputs.references.length < model.maxReferences) {
      setInputs((current) => ({ ...current, references: [...current.references, frame] }));
      notify("Added to your references.", undefined, "success");
    } else {
      if (mode === "text" || mode === "reference") changeMode("image");
      setInputs((current) => ({ ...current, start: frame }));
      notify(message, undefined, "success");
    }
    setViewerId(null);
    revealPanel();
    focusPrompt();
  }

  async function startFromResult(item: VideoResult) {
    try {
      takeFrame(
        await loadSampleFrame(item.poster, "Frame from your video"),
        "Start image set. Describe how the scene should move next.",
      );
    } catch {
      notify("That frame couldn’t be added. Please try again.");
    }
  }

  function swapFrames() {
    setInputs((current) => ({ ...current, start: current.end, end: current.start }));
  }

  function applyInspiration(id: string, keepMode = false, message?: string) {
    const inspiration = videoInspirations.find((item) => item.id === id);
    if (!inspiration) return;
    const current = latest.current.settings;
    const { settings: next } = fitSettingsToModel({
      ...current,
      mode: keepMode ? current.mode : "text",
      prompt: inspiration.prompt,
      aspectRatio: inspiration.aspectRatio,
      duration: inspiration.duration,
    });
    setSettings(next);
    setError(null);
    notify(message ?? `“${inspiration.title}” is loaded. Make it yours, then generate.`);
    focusPrompt();
  }

  function surprise() {
    const options = videoInspirations.filter((item) => item.prompt !== settings.prompt);
    const pick = options[Math.floor(Math.random() * options.length)];
    applyInspiration(pick.id, true, `Here’s an idea: “${pick.title}”.`);
  }

  const startRender = useCallback(
    (snapshot: Snapshot) => {
      const { request, prompt, frameUrl } = snapshot;
      const id = `job-${crypto.randomUUID()}`;
      const job: RenderJob = {
        id,
        prompt,
        model: request.model,
        mode: request.mode,
        aspectRatio: request.aspectRatio,
        duration: request.duration,
        resolution: request.resolution,
        count: request.count,
        startedAt: Date.now(),
        eta: previewRenderMs(request) + Math.round(Math.random() * 800),
        frameUrl,
        status: "rendering",
      };
      const controller = new AbortController();
      controllers.current.set(id, controller);
      snapshots.current.set(id, snapshot);
      setJobs((current) => [job, ...current]);
      setAnnouncement(
        `Rendering ${request.count === 1 ? "a sample video" : `${request.count} sample videos`}. You can keep working.`,
      );

      Promise.all([requestVideoPreview(request, controller.signal), wait(job.eta, controller.signal)])
        .then(([response]) => {
          const videos = response.videos.map((video) => ({ ...video, prompt }));
          snapshots.current.set(response.id, snapshot);
          setJobs((current) => current.filter((entry) => entry.id !== id));
          setItems((current) => [...videos, ...current].slice(0, MAX_ITEMS));
          setFilter("all");
          const text = `${videos.length === 1 ? "Your video is" : `${videos.length} videos are`} ready. No credits were used.`;
          setAnnouncement(text);
          notify(text, { label: "Watch", run: () => setViewerId(videos[0].id) }, "success");
        })
        .catch((caught: unknown) => {
          if (controller.signal.aborted) return;
          const message = caught instanceof VideoPreviewError ? caught.message : "Something interrupted the preview.";
          setJobs((current) =>
            current.map((entry) => (entry.id === id ? { ...entry, status: "failed", error: message } : entry)),
          );
          setAnnouncement(`A render failed. ${message}`);
        })
        .finally(() => {
          controllers.current.delete(id);
        });
    },
    [notify],
  );

  function generate(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (jobs.filter((job) => job.status === "rendering").length >= MAX_ACTIVE_RENDERS) {
      notify(`Up to ${MAX_ACTIVE_RENDERS} videos can render at once. One will finish soon.`);
      return;
    }
    const fitted = fitSettingsToModel(settings).settings;
    const prompt = fitted.prompt.trim();
    const { start, end, references, clip } = inputs;
    const needsPrompt = (message: string) => {
      setError(message);
      promptRef.current?.focus();
    };
    if (fitted.mode === "text" && !prompt)
      return needsPrompt("Describe your scene in a few words first, or start from an image.");
    if (fitted.mode === "image" && !start) return setInputError("Add a start image to animate.");
    if (fitted.mode === "reference" && !references.length) return setInputError("Add at least one reference image.");
    if (fitted.mode === "reference" && !prompt)
      return needsPrompt("Describe how your references come together, e.g. “the person in image 1…”.");
    if (fitted.mode === "motion" && !start) return setInputError("Add a character image to animate.");
    if (fitted.mode === "motion" && !clip) return setInputError("Add a motion clip to copy.");

    const usedReferences = fitted.mode === "reference" ? references.slice(0, model.maxReferences) : [];
    const request: VideoGenerationRequest = {
      ...fitted,
      prompt,
      duration: effectiveDuration(fitted, clip),
      inputs: {
        start: (fitted.mode === "image" || fitted.mode === "motion") && start ? descriptor(start) : null,
        end: fitted.mode === "image" && model.endFrame && end ? descriptor(end) : null,
        references: usedReferences.map(descriptor),
        clip:
          fitted.mode === "motion" && clip
            ? { id: clip.id, mimeType: clip.mimeType, size: clip.size, duration: Math.round(clip.duration * 10) / 10 }
            : null,
      },
    };
    setError(null);
    setInputError("");
    const frameUrl =
      fitted.mode === "reference" ? usedReferences[0]?.url : fitted.mode === "text" ? undefined : start?.url;
    startRender({ request, prompt, frameUrl });
    if (window.matchMedia("(max-width: 900px)").matches) {
      requestAnimationFrame(() =>
        stageRef.current?.scrollIntoView({ block: "start", behavior: motionEnabled ? "smooth" : "instant" }),
      );
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
    if (snapshot)
      startRender({
        ...snapshot,
        frameUrl:
          snapshot.frameUrl?.startsWith("blob:") && !ownedUrls.current.has(snapshot.frameUrl)
            ? undefined
            : snapshot.frameUrl,
      });
  }

  function reuse(item: VideoResult) {
    const { settings: next } = fitSettingsToModel({
      ...settings,
      model: item.model,
      prompt: item.prompt,
      mode: item.mode,
      aspectRatio: item.aspectRatio,
      resolution: item.resolution,
      duration: item.duration,
      audio: item.audio,
    });
    setSettings(next);
    setError(null);
    notify(
      item.mode === "text"
        ? "Prompt and settings restored."
        : `Settings restored. Check your ${item.mode === "reference" ? "references" : "uploads"} before rendering again.`,
    );
    revealPanel();
    focusPrompt();
  }

  function upscale(item: VideoResult) {
    const snapshot = snapshots.current.get(item.batchId);
    if (!snapshot) {
      reuse(item);
      update({ resolution: "1080p" });
      return;
    }
    startRender({
      request: { ...snapshot.request, resolution: "1080p", count: 1 },
      prompt: snapshot.prompt,
      frameUrl: item.poster,
    });
    notify("Rendering this shot again in 1080p.");
  }

  function remove(ids: ReadonlySet<string>, label: string) {
    const removed = items.filter((item) => ids.has(item.id));
    if (!removed.length) return;
    setItems((current) => current.filter((item) => !ids.has(item.id)));
    if (viewerId && ids.has(viewerId)) setViewerId(null);
    notify(label, {
      label: "Undo",
      run: () =>
        setItems((current) =>
          [...removed, ...current].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, MAX_ITEMS),
        ),
    });
  }

  function copy(text: string, label: string) {
    navigator.clipboard?.writeText(text).then(
      () => notify(`${label} copied.`),
      () => notify(`${label} couldn’t be copied.`),
    );
  }

  // ⌘/Ctrl + Enter generates from anywhere; "/" jumps to the prompt.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (document.querySelector("dialog[open], [popover]:popover-open")) return;
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        formWrapRef.current?.querySelector("form")?.requestSubmit();
      } else if (
        event.key === "/" &&
        !(event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable]"))
      ) {
        event.preventDefault();
        promptRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const rendering = jobs.filter((job) => job.status === "rendering").length;
  const favorites = items.filter((item) => item.favorite).length;
  const visible = filter === "favorites" ? items.filter((item) => item.favorite) : items;
  const empty = items.length === 0 && jobs.length === 0;
  const toggleFavorite = (id: string) =>
    setItems((current) => current.map((item) => (item.id === id ? { ...item, favorite: !item.favorite } : item)));

  return (
    <main
      className={styles.workspace}
      id="main-content"
      tabIndex={-1}
      onPaste={(event) => {
        if (event.clipboardData.files.length && routeFiles(Array.from(event.clipboardData.files)))
          event.preventDefault();
      }}
    >
      <h1 className={styles.srOnly}>Pixel Magic video studio</h1>

      <div ref={formWrapRef} className={styles.panelWrap}>
        <DirectorPanel
          settings={settings}
          inputs={inputs}
          inputBusy={inputBusy}
          inputError={inputError}
          activeRenders={rendering}
          error={error}
          promptRef={promptRef}
          onChange={update}
          onModeChange={changeMode}
          onModelChange={changeModel}
          onFiles={(target, files) => void addFiles(target, files)}
          onRemove={removeInput}
          onSwap={swapFrames}
          onClearInputs={clearInputs}
          onSurprise={surprise}
          onSubmit={generate}
        />
      </div>

      <section
        ref={stageRef}
        className={styles.stage}
        aria-label="Your videos"
        aria-busy={rendering > 0}
        style={{ "--feed-row-height": rowHeights[rowSize] } as CSSProperties}
        onDragOver={(event) => {
          if (event.dataTransfer.types.includes("Files")) event.preventDefault();
        }}
        onDrop={(event) => {
          if (routeFiles(Array.from(event.dataTransfer.files))) event.preventDefault();
        }}
      >
        <div className={styles.toolbar}>
          <div className={styles.tabs} role="group" aria-label="Filter videos">
            <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
              All<span>{items.length}</span>
            </button>
            <button type="button" aria-pressed={filter === "favorites"} onClick={() => setFilter("favorites")}>
              <Heart size={12} aria-hidden="true" />
              Favorites<span>{favorites}</span>
            </button>
          </div>
          <div className={styles.toolbarEnd}>
            {rendering > 0 && (
              <span className={styles.renderingPill}>
                <LoaderCircle size={12} className={styles.spinner} aria-hidden="true" />
                {rendering} rendering
              </span>
            )}
            {!empty && (
              <div className={styles.sizes} role="group" aria-label="Thumbnail size">
                {(["s", "m", "l"] as const).map((size) => (
                  <button
                    type="button"
                    key={size}
                    aria-pressed={rowSize === size}
                    onClick={() => setRowSize(size)}
                    aria-label={{ s: "Small", m: "Medium", l: "Large" }[size]}
                  >
                    <span data-size={size} aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              className={styles.help}
              onClick={() => setHelpOpen(true)}
              aria-label="How the video studio works"
            >
              <CircleHelp size={17} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className={styles.content}>
          {empty ? (
            <VideoWelcome
              autoplay={motionEnabled}
              onSelectInspiration={(id) => applyInspiration(id)}
              onSelectMode={(mode) => {
                changeMode(mode);
                revealPanel();
              }}
            />
          ) : filter === "favorites" && !visible.length ? (
            <div className={styles.emptyFavorites}>
              <Heart size={26} strokeWidth={1.4} aria-hidden="true" />
              <h2>Keep the takes you love.</h2>
              <p>Tap the heart on any video to collect it here.</p>
              <button type="button" onClick={() => setFilter("all")}>
                Show all videos
              </button>
            </div>
          ) : (
            <VideoFeed
              items={visible}
              jobs={filter === "all" ? jobs : []}
              motionEnabled={motionEnabled}
              onOpen={setViewerId}
              onFavorite={toggleFavorite}
              onUseFrame={(item) => void startFromResult(item)}
              onReuse={reuse}
              onUpscale={upscale}
              onCopyPrompt={(prompt) => copy(prompt, "Prompt")}
              onDeleteBatch={(batchId) => {
                const ids = new Set(items.filter((item) => item.batchId === batchId).map((item) => item.id));
                remove(ids, ids.size === 1 ? "Video deleted." : `${ids.size} videos deleted.`);
              }}
              onCancel={cancelJob}
              onRetry={retryJob}
              onDismiss={(id) => setJobs((current) => current.filter((job) => job.id !== id))}
            />
          )}
        </div>

        {toast && (
          <div key={toast.id} className={styles.toast} data-tone={toast.tone} role="status">
            {toast.tone === "success" ? (
              <Sparkles size={15} aria-hidden="true" />
            ) : (
              <Info size={15} aria-hidden="true" />
            )}
            <span>{toast.text}</span>
            {toast.action && (
              <button
                type="button"
                className={styles.toastAction}
                onClick={() => {
                  toast.action?.run();
                  setToast(null);
                }}
              >
                {toast.action.label === "Undo" && <RotateCcw size={12} aria-hidden="true" />}
                {toast.action.label}
              </button>
            )}
            <button
              type="button"
              className={styles.toastClose}
              onClick={() => setToast(null)}
              aria-label="Dismiss notification"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        )}
      </section>

      <VideoViewer
        items={visible}
        activeId={viewerId}
        autoplay={motionEnabled}
        onNavigate={setViewerId}
        onClose={() => setViewerId(null)}
        onFavorite={toggleFavorite}
        onReuse={reuse}
        onUpscale={upscale}
        onAnimateFrame={(frame) => takeFrame(frame, "Frame captured. Describe what happens next.")}
        onDelete={(id) => remove(new Set([id]), "Video deleted.")}
        onCopy={copy}
        onError={(message) => notify(message)}
      />

      <p className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>

      <Modal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="How the video studio works"
        className={styles.helpModal}
      >
        <div className={styles.helpContent}>
          <span className={styles.helpMark}>
            <Sparkles size={24} aria-hidden="true" />
          </span>
          <h2>
            From a single frame
            <br />
            to a <em>moving story.</em>
          </h2>
          <ol>
            <li>
              <span>01</span>
              <div>
                <strong>Pick a mode and a model.</strong>
                <p>
                  Text, Image, Motion Control or Reference to Video. The model list shows only models that support your
                  mode, and the uploads adapt to the model.
                </p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Add your inputs and prompt.</strong>
                <p>
                  Drop, paste or upload images and clips. Then set the duration, shape, resolution and number of videos.
                </p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>Render, compare, refine.</strong>
                <p>
                  Up to {MAX_ACTIVE_RENDERS} renders run at once while you keep working. Reuse settings, pause on a
                  moment to animate from it, or render a favorite in 1080p.
                </p>
              </div>
            </li>
          </ol>
          <div className={styles.helpKeys}>
            <span>
              <kbd>⌘</kbd>
              <kbd>↵</kbd> Generate
            </span>
            <span>
              <kbd>/</kbd> Focus prompt
            </span>
            <span>
              <kbd>⌘</kbd>
              <kbd>V</kbd> Paste an image or clip
            </span>
          </div>
          <div className={styles.helpNotice}>
            <Info size={16} aria-hidden="true" />
            <p>
              This is a design preview. Results are pre-existing sample clips, not AI-generated video, and no credits
              are charged. Credit and time estimates are indicative. Your uploads stay in this browser.
            </p>
          </div>
          <button
            type="button"
            className="button-primary"
            onClick={() => {
              setHelpOpen(false);
              focusPrompt();
            }}
          >
            Start directing <ArrowDownLeft size={16} aria-hidden="true" />
          </button>
        </div>
      </Modal>
    </main>
  );
}
