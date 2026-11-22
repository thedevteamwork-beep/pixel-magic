"use client";

import { ArrowDownLeft, CircleHelp, Heart, Info, LoaderCircle, RotateCcw, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import {
  defaultVideoSettings,
  MAX_ACTIVE_RENDERS,
  VIDEO_HISTORY_PAGE_SIZE,
  videoInspirations,
} from "@/components/video-generator/constants";
import { Modal } from "@/ui/Modal";
import { useLandingMotion } from "@/components/landing/LandingProvider";
import { api, ApiError } from "@/lib/api/client";
import type { JobList, JobView, ProjectView } from "@/lib/api/types";
import { useSignedIn } from "@/lib/auth/useSignedIn";
import { isSessionEnded, messageForError } from "@/lib/generate/messages";
import { isActiveJob } from "@/lib/image-generator/results";
import { useIncomingImage } from "@/lib/handoff/useIncomingImage";
import { jobToVideoResults } from "@/lib/video-generator/models";
import { listVideoProjects, settingsFromProject, uploadFieldsFromProject } from "@/lib/video-generator/projects";
import {
  captureLastFrame,
  FrameError,
  loadClipFile,
  loadFrameFile,
  loadSampleFrame,
} from "@/lib/video-generator/frames";
import {
  closestAspectRatio,
  fitSettingsToModel,
  getVideoModel,
  modeName,
  modelsForMode,
  estimateRenderSeconds,
} from "@/lib/video-generator/settings";
import type {
  FrameImage,
  RenderJob,
  VideoInputs,
  VideoMode,
  VideoModel,
  VideoResult,
  VideoSettings,
} from "@/types/video-generator";
import { sampleVideoJobs } from "../fixtures/sampleVideos";
import { VideoSkeleton } from "../VideoSkeleton";
import {
  followJob,
  newRenderKeys,
  renderVideos,
  StillRenderingError,
  type RenderRequest,
  type RenderSaved,
  type RenderUpload,
} from "./renderVideos";
import { idsKey, inputsKey, markUploaded, renderUploads, uploadsKey } from "./uploads";
import { useVideoEstimate } from "./useVideoEstimate";
import { useVideoModels } from "./useVideoModels";
import { DirectorPanel } from "../DirectorPanel";
import type { InputTarget } from "../InputsSection";
import { VideoFeed } from "../VideoFeed";
import { VideoViewer } from "../VideoViewer";
import { VideoWelcome } from "../VideoWelcome";
import styles from "./main.module.css";

type Toast = { id: number; text: string; action?: { label: string; run: () => void }; tone?: "success" | "info" };
/** What a render needs to be retried or rendered again at a higher resolution. */
type Snapshot = { request: RenderRequest; frameUrl?: string };

/** The video idea Generate adds takes to, and which files it was made from (see `uploadsKey`). */
type OpenIdea = { project: ProjectView; filesKey: string };
type RowSize = "s" | "m" | "l";
const rowHeights: Record<RowSize, string> = { s: "190px", m: "280px", l: "400px" };
const MAX_ITEMS = 60;
const emptyInputs: VideoInputs = { start: null, end: null, references: [], clip: null };

function initialSettings(models: readonly VideoModel[], modelId: string, preset: string | null): VideoSettings {
  const inspiration = videoInspirations.find((item) => item.id === preset);
  const model = getVideoModel(models, modelId);
  const base: VideoSettings = { ...defaultVideoSettings, model: model.id };
  if (!inspiration) return fitSettingsToModel(base, model).settings;
  return fitSettingsToModel(
    {
      ...base,
      prompt: inspiration.prompt,
      aspectRatio: inspiration.aspectRatio,
      duration: inspiration.duration,
    },
    model,
  ).settings;
}

function renderError(error: unknown): string {
  if (error instanceof StillRenderingError) return error.message;
  if (error instanceof ApiError && error.code === "INSUFFICIENT_CREDITS")
    return "You don’t have enough credits for this. Add credits on the Pricing page, or pick a shorter or smaller video.";
  return messageForError(error);
}

type VideoWorkspaceProps = {
  initialModel: string;
  initialPreset: string | null;
  /** Development only: sample videos, and Generate only pretends. */
  sample?: boolean;
};

/** Loads the backend's video models, then opens the studio; the skeleton shows meanwhile. */
export function VideoWorkspace(props: VideoWorkspaceProps) {
  const { models, error, retry } = useVideoModels();
  if (models?.length) return <VideoStudio {...props} models={models} />;
  if (!error && !models) return <VideoSkeleton />;
  return (
    <main className={styles.loadError} id="main-content" role="alert">
      <h1>The video models couldn’t load.</h1>
      <p>Check your connection, then try again.</p>
      <button type="button" className="button-primary" onClick={retry}>
        Try again
      </button>
    </main>
  );
}

function VideoStudio({
  initialModel,
  initialPreset,
  sample = false,
  models,
}: VideoWorkspaceProps & { models: readonly VideoModel[] }) {
  const router = useRouter();
  const signedIn = useSignedIn();
  const { motionEnabled } = useLandingMotion();
  const [settings, setSettings] = useState<VideoSettings>(() => initialSettings(models, initialModel, initialPreset));
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
  /** Video ideas (projects) known here, by id: from history and from renders. */
  const ideas = useRef(new Map<string, ProjectView>());
  const [openIdea, setOpenIdea] = useState<OpenIdea | null>(null);
  const ownedUrls = useRef(new Set<string>());
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Async uploads finish after renders; read the latest settings and inputs, not a stale closure.
  const latest = useRef({ settings, inputs });
  useEffect(() => {
    latest.current = { settings, inputs };
  });
  const model = getVideoModel(models, settings.model);
  const credits = useVideoEstimate(model, settings, inputs);

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
    const next = getVideoModel(models, id);
    const { settings: fitted, adjustments } = fitSettingsToModel(latest.current.settings, next);
    setSettings(fitted);
    if (adjustments.length) notify(`Switched to ${next.name}. Adjusted to fit: ${adjustments.join(", ")}.`);
  }

  /** A mode the current model can’t do moves to the best model that can, and says so. */
  function changeMode(mode: VideoMode) {
    const current = latest.current.settings;
    setInputError("");
    setError(null);
    if (getVideoModel(models, current.model).modes.includes(mode)) {
      setSettings({ ...current, mode });
      return;
    }
    const next = modelsForMode(models, mode)[0];
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
    const ratio = closestAspectRatio(frame.width, frame.height, getVideoModel(models, current.model).aspectRatios);
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
        const limit = getVideoModel(models, latest.current.settings.model).maxReferences;
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
    else if (
      current.mode === "image" &&
      attached.start &&
      !attached.end &&
      getVideoModel(models, current.model).endFrame
    )
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
      // Continue from where the shot ends.
      takeFrame(
        await captureLastFrame(item.url, "Last frame of your video"),
        "Start image set from the last frame. Describe what happens next.",
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
    const { settings: next } = fitSettingsToModel(
      {
        ...current,
        mode: keepMode ? current.mode : "text",
        prompt: inspiration.prompt,
        aspectRatio: inspiration.aspectRatio,
        duration: inspiration.duration,
      },
      getVideoModel(models, current.model),
    );
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

  /** A render in the feed: a live card while it runs, its videos once done. Failures stay as a card with Retry. */
  const startRender = useCallback(
    (snapshot: Snapshot, existing?: JobView) => {
      let current = snapshot;
      const { request, frameUrl } = snapshot;
      const id = existing ? `job-${existing.jobId}` : `job-${crypto.randomUUID()}`;
      const job: RenderJob = {
        id,
        prompt: request.prompt,
        model: request.model.id,
        mode: request.settings.mode,
        aspectRatio: request.settings.aspectRatio,
        duration: request.settings.duration,
        resolution: request.settings.resolution,
        count: request.keys.length,
        startedAt: existing ? Date.parse(existing.createdAt) : Date.now(),
        eta: estimateRenderSeconds(request.model, request.settings) * 1000,
        frameUrl,
        status: "rendering",
      };
      const controller = new AbortController();
      controllers.current.set(id, controller);
      snapshots.current.set(id, snapshot);
      setJobs((current) => [job, ...current.filter((entry) => entry.id !== id)]);
      setAnnouncement(`Rendering ${job.count === 1 ? "a video" : `${job.count} videos`}. You can keep working.`);

      // The idea is saved before credits are spent: remember it (and every file's upload) right away,
      // so a retry, a 1080p render and the next Generate all continue it without uploading again.
      const saved = ({ project, uploadIds }: RenderSaved) => {
        ideas.current.set(project.projectId, project);
        const uploads = Object.fromEntries(
          Object.entries(current.request.uploads).map(([field, files]) => [
            field,
            files.map((file) => ({ key: file.key, uploadId: uploadIds[file.key] ?? file.uploadId })),
          ]),
        );
        current = { ...current, request: { ...current.request, project, uploads } };
        snapshots.current.set(id, current);
        snapshots.current.set(project.projectId, current);
        setInputs((inputs) => markUploaded(inputs, uploadIds));
        setOpenIdea({ project, filesKey: uploadsKey(uploads) });
      };

      // A job already running (from an earlier visit) is only followed; a new render saves the idea and creates its jobs.
      const work = existing
        ? followJob(existing, controller.signal).then((done) =>
            jobToVideoResults(done, { poster: request.project?.upload?.url }),
          )
        : renderVideos(request, controller.signal, saved);
      work
        .then((videos) => {
          setJobs((current) => current.filter((entry) => entry.id !== id));
          setItems((current) => [...videos, ...current].slice(0, MAX_ITEMS));
          setFilter("all");
          const text = `${videos.length === 1 ? "Your video is" : `${videos.length} videos are`} ready.`;
          setAnnouncement(text);
          notify(text, { label: "Watch", run: () => setViewerId(videos[0].id) }, "success");
        })
        .catch((caught: unknown) => {
          if (controller.signal.aborted) return;
          if (isSessionEnded(caught)) {
            router.push(`/sign-in?next=${encodeURIComponent("/video")}`);
            return;
          }
          // Still running, not failed: retrying would pay twice, so the card goes and the video comes later.
          if (caught instanceof StillRenderingError) {
            setJobs((current) => current.filter((entry) => entry.id !== id));
            notify(caught.message);
            return;
          }
          const message = renderError(caught);
          setJobs((current) =>
            current.map((entry) => (entry.id === id ? { ...entry, status: "failed", error: message } : entry)),
          );
          setAnnouncement(`A render failed. ${message}`);
        })
        .finally(() => {
          controllers.current.delete(id);
        });
    },
    [notify, router],
  );

  // Signed in: the video history, and renders still running from an earlier visit. Sample mode: the samples.
  useEffect(() => {
    if (sample) {
      const { jobs: samples, posters } = sampleVideoJobs();
      // Fixtures stand in for the history request, so they are set the same way, from an effect.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setItems(samples.flatMap((job) => jobToVideoResults(job, { poster: posters[job.jobId] })));
      return;
    }
    if (!signedIn) return;
    const controller = new AbortController();
    const { signal } = controller;
    // The ideas (their settings and start images) and their takes, side by side.
    Promise.all([
      listVideoProjects(api, VIDEO_HISTORY_PAGE_SIZE),
      api.get<JobList>(`/v1/jobs?kind=video&limit=${VIDEO_HISTORY_PAGE_SIZE}`, { signal }),
    ])
      .then(([{ projects }, { jobs: history }]) => {
        if (signal.aborted) return;
        for (const project of projects) {
          ideas.current.set(project.projectId, project);
          // Each idea can be rendered again (in 1080p, say) with its saved settings and start image.
          const ideaModel = models.find((item) => item.id === project.data.model);
          if (!ideaModel || snapshots.current.has(project.projectId)) continue;
          const settings = fitSettingsToModel(
            settingsFromProject(project, { ...defaultVideoSettings, model: ideaModel.id }),
            ideaModel,
          ).settings;
          snapshots.current.set(project.projectId, {
            request: {
              model: ideaModel,
              settings,
              prompt: settings.prompt,
              // The idea's files, already uploaded: a render of it sends them again.
              uploads: Object.fromEntries(
                Object.entries(uploadFieldsFromProject(project)).map(([field, ids]) => [
                  field,
                  ids.map((uploadId) => ({ key: uploadId, uploadId })),
                ]),
              ),
              project,
              poster: project.upload?.url,
              keys: [],
            },
            frameUrl: project.upload?.url,
          });
        }
        const posterOf = (job: JobView) => (job.projectId ? ideas.current.get(job.projectId)?.upload?.url : undefined);
        setItems((current) => {
          const known = new Set(current.map((item) => item.jobId));
          const loaded = history.flatMap((job) =>
            known.has(job.jobId) ? [] : jobToVideoResults(job, { poster: posterOf(job) }),
          );
          return [...current, ...loaded].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, MAX_ITEMS);
        });
        // Takes still rendering from an earlier visit come back as live cards.
        for (const job of history.filter(isActiveJob)) {
          const jobModel = models.find((item) => item.id === job.model);
          if (!jobModel) continue;
          const idea = job.projectId ? snapshots.current.get(job.projectId) : undefined;
          const prompt = typeof job.input.prompt === "string" ? job.input.prompt : "";
          const request: RenderRequest = idea
            ? { ...idea.request, keys: [job.jobId] }
            : {
                model: jobModel,
                settings: fitSettingsToModel(
                  {
                    ...defaultVideoSettings,
                    model: jobModel.id,
                    prompt,
                    duration: Number(job.input.duration) || jobModel.durations[0],
                    resolution: typeof job.input.resolution === "string" ? job.input.resolution : "",
                    aspectRatio: typeof job.input.aspect_ratio === "string" ? job.input.aspect_ratio : "16:9",
                    count: 1,
                  },
                  jobModel,
                ).settings,
                prompt,
                uploads: {},
                keys: [job.jobId],
              };
          startRender({ request, frameUrl: idea?.frameUrl }, job);
        }
      })
      // History is a convenience: the studio works without it.
      .catch(() => undefined);
    return () => controller.abort();
  }, [sample, signedIn, models, startRender]);

  async function generate(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (jobs.filter((job) => job.status === "rendering").length >= MAX_ACTIVE_RENDERS) {
      notify(`Up to ${MAX_ACTIVE_RENDERS} videos can render at once. One will finish soon.`);
      return;
    }
    const fitted = fitSettingsToModel(settings, model).settings;
    const prompt = fitted.prompt.trim();
    const { start, references, clip } = inputs;
    const needsPrompt = (message: string) => {
      setError(message);
      promptRef.current?.focus();
    };
    if (fitted.mode === "text" && !prompt)
      return needsPrompt("Describe your scene in a few words first, or start from an image.");
    if (fitted.mode === "image" && !start) return setInputError("Add a start image to animate.");
    if (fitted.mode === "reference" && !references.length) return setInputError("Add at least one reference image.");
    if (fitted.mode === "reference" && !prompt)
      return needsPrompt("Describe how your references come together, e.g. “@Image1 walks through @Image2…”.");
    if (fitted.mode === "motion" && !start)
      return setInputError("Add your character: a photo with the head and body visible.");
    if (fitted.mode === "motion" && !clip) return setInputError("Add a clip whose movement your character copies.");
    if (signedIn === false && !sample) {
      router.push(`/sign-in?next=${encodeURIComponent(`/video?model=${model.id}`)}`);
      return;
    }
    setError(null);
    setInputError("");
    // Files uploaded for an earlier take are reused; new ones are read for upload.
    let uploads: Record<string, RenderUpload[]>;
    try {
      uploads = await renderUploads(model, fitted.mode, inputs);
    } catch {
      setInputError("One of your files couldn’t be read. Please add it again.");
      return;
    }
    const still = fitted.mode === "reference" ? references[0]?.url : fitted.mode === "text" ? undefined : start?.url;
    startRender({
      request: {
        model,
        settings: fitted,
        prompt,
        uploads,
        // Same prompt and files as the open idea: another take of it. Otherwise a new idea.
        project: continuing ? openIdea?.project : undefined,
        poster: still,
        sample,
        keys: newRenderKeys(fitted.count),
      },
      frameUrl: still,
    });
    if (window.matchMedia("(max-width: 900px)").matches) {
      requestAnimationFrame(() =>
        stageRef.current?.scrollIntoView({ block: "start", behavior: motionEnabled ? "smooth" : "instant" }),
      );
    }
  }

  /** Stops waiting here. A render already started keeps going on the server and appears on a later visit. */
  function cancelJob(id: string) {
    controllers.current.get(id)?.abort();
    controllers.current.delete(id);
    setJobs((current) => current.filter((job) => job.id !== id));
    setAnnouncement("Stopped waiting for this render.");
    notify("Stopped waiting. If it had started, it will still finish and appear here next time.");
  }

  function retryJob(id: string) {
    const snapshot = snapshots.current.get(id);
    setJobs((current) => current.filter((job) => job.id !== id));
    // New job ids: a failed job keeps its id, so reusing it would only return the same failure.
    if (snapshot)
      startRender({
        ...snapshot,
        request: { ...snapshot.request, keys: newRenderKeys(snapshot.request.keys.length) },
        frameUrl:
          snapshot.frameUrl?.startsWith("blob:") && !ownedUrls.current.has(snapshot.frameUrl)
            ? undefined
            : snapshot.frameUrl,
      });
  }

  /** Loads a take's prompt and settings, and reopens its idea so the next Generate adds to it. */
  function reuse(item: VideoResult) {
    const { settings: next } = fitSettingsToModel(
      {
        ...settings,
        model: item.model,
        prompt: item.prompt,
        mode: item.mode,
        aspectRatio: item.aspectRatio,
        resolution: item.resolution,
        duration: item.duration,
        audio: item.audio,
      },
      getVideoModel(models, item.model),
    );
    setSettings(next);
    setError(null);
    revealPanel();
    focusPrompt();
    const idea = ideas.current.get(item.batchId);
    if (!idea) {
      notify(item.mode === "text" ? "Prompt and settings restored." : "Settings restored. Add your files again.");
      return;
    }
    // The next Generate adds to this idea while it sends the same files.
    setOpenIdea({ project: idea, filesKey: idsKey(uploadFieldsFromProject(idea)) });
    const upload = idea.upload;
    if (item.mode === "text") return notify("Settings restored. New renders join this video.");
    if (item.mode === "reference" || !upload)
      return notify("Settings restored. Add the same references to add takes to this video.");
    // Its start image (or character) comes back too, already uploaded.
    loadSampleFrame(upload.url, item.mode === "motion" ? "Character" : "Start image")
      .then((frame) => {
        setInputs((current) => ({ ...current, start: track({ ...frame, uploadId: upload.uploadId }) }));
        notify(
          item.mode === "motion"
            ? "Settings and character restored. Add the clip again to add takes to this video."
            : "Settings and start image restored. New renders join this video.",
        );
      })
      .catch(() => notify("Settings restored. Add the start image again."));
  }

  /** Renders a shot again at 1080p, with the same prompt, settings and start image. */
  function upscale(item: VideoResult) {
    const snapshot = snapshots.current.get(item.batchId);
    if (!snapshot) {
      reuse(item);
      update({ resolution: "1080p" });
      notify("Settings restored at 1080p. Generate to render it again.");
      return;
    }
    const { request } = snapshot;
    startRender({
      request: { ...request, settings: { ...request.settings, resolution: "1080p", count: 1 }, keys: newRenderKeys(1) },
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
  // Generate adds a take to the open idea while its prompt and start image are unchanged.
  const continuing = Boolean(
    openIdea &&
    openIdea.project.data.prompt === settings.prompt.trim() &&
    openIdea.filesKey === inputsKey(model, settings.mode, inputs),
  );
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
          models={models}
          model={model}
          creditsPerVideo={credits}
          signedIn={sample ? true : signedIn}
          continuing={continuing && openIdea ? openIdea.project.title : null}
          onNewIdea={() => setOpenIdea(null)}
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
          onSubmit={(event) => void generate(event)}
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
            <VideoWelcome autoplay={motionEnabled} onTryExample={surprise} />
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
              models={models}
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
        models={models}
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
                  Text to Video, or Image to Video from a start image. The settings adapt to each model: its lengths,
                  shapes, resolutions and sound.
                </p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Add your inputs and prompt.</strong>
                <p>
                  Drop, paste or upload a start image. Then set the duration, shape, resolution and number of videos.
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
              Each video uses the credits shown on Generate; several videos cost that much each. If a render fails, its
              credits are returned. Times are estimates. Your videos are saved to your account.
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
