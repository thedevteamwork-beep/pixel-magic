"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  AtSign,
  ImagePlus,
  Info,
  LoaderCircle,
  Plus,
  RotateCcw,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { REFERENCE_MIME_TYPES } from "@/constants/image-generator";
import { useSignedIn } from "@/lib/auth/useSignedIn";
import { isSessionEnded } from "@/lib/generate/messages";
import { handoffPaths, sendImage } from "@/lib/handoff/image";
import { useIncomingImage } from "@/lib/handoff/useIncomingImage";
import { resultAsFile } from "@/lib/image-generator/download";
import { downloadName } from "@/lib/image-generator/results";
import {
  composeImageGuidance,
  composeImagePrompt,
  defaultCreativeGuidance,
  parseImageGuidance,
  type CreativeGuidance,
} from "@/lib/image-generator/guidance";
import { resolveOptions, shapeOf, shapeOption } from "@/lib/image-generator/models";
import { urlsAsFiles } from "@/lib/image-generator/templateFiles";
import { landingAssets } from "@/constants/landing-media";
import type { TemplateItem } from "@/types/landing";
import { generationError, runningCount, stripRuns } from "@/lib/image-generator/runs";
import type { ImageOptionValue, ImageResult, ImageSettings, NextStep, ReferenceImage } from "@/types/image-generator";
import { Modal } from "@/ui/Modal";
import { useLandingMotion } from "@/components/landing/LandingProvider";
import {
  DEFAULT_IMAGE_MODEL,
  TEMPLATE_IMAGE_MODEL,
  defaultImageSettings,
  imageInspirations,
  lightingOptions,
  MAX_IMAGE_RUNS,
  paletteOptions,
  resultNextSteps,
} from "./constants";
import { CreativePanel } from "./CreativePanel";
import { DockSettings } from "./DockSettings";
import { ImageResults } from "./ImageResults";
import { ReferenceUploader, type ReferenceUploadHandle } from "./ReferenceUploader";
import { useCreditEstimate } from "./useCreditEstimate";
import { useImageJobs, type RunEvents } from "./useImageJobs";
import { useImageModels } from "./useImageModels";
import { useLibraryPrefs } from "./useLibraryPrefs";
import styles from "./main.module.css";

type Feedback = { text: string; action?: { label: string; run: () => void; icon?: LucideIcon } };
type Draft = { settings: ImageSettings; guidance: CreativeGuidance };

/** The composer survives the trip to sign in and back; references can't, they are local files. */
const DRAFT_KEY = "pixelmagic:image-draft";

function fitPromptHeight(prompt: HTMLTextAreaElement | null) {
  if (!prompt || !prompt.getClientRects().length) return;
  prompt.style.height = "auto";
  prompt.style.height = `${Math.min(prompt.scrollHeight, 104)}px`;
}

/** A prompt short enough for a toast. */
function shortPrompt(prompt: string): string {
  const text = prompt.trim() || "Untitled";
  return text.length > 40 ? `${text.slice(0, 38).trimEnd()}…` : text;
}

/** Only the plain option values a result was made with, ready to put back in the composer. */
function FeedbackIcon({ icon: Icon = RotateCcw }: { icon?: LucideIcon }) {
  return <Icon size={13} aria-hidden="true" />;
}

function optionValues(input: Record<string, unknown>): Record<string, ImageOptionValue> {
  return Object.fromEntries(
    Object.entries(input).filter(
      (entry): entry is [string, ImageOptionValue] =>
        entry[0] !== "prompt" && (typeof entry[1] === "string" || typeof entry[1] === "number"),
    ),
  );
}

export function ImageWorkspace({
  initialModel,
  initialPreset,
  initialPrompt,
  initialReferences = [],
  sample = false,
}: {
  initialModel: string | null;
  initialPreset: string | null;
  initialPrompt?: string | null;
  initialReferences?: readonly string[];
  /** Development only: sample results, and Generate only pretends. */
  sample?: boolean;
}) {
  const { motionEnabled } = useLandingMotion();
  const router = useRouter();
  const preset = imageInspirations.find((item) => item.id === initialPreset);
  const [settings, setSettings] = useState<ImageSettings>({
    ...defaultImageSettings,
    model: initialModel,
    prompt: initialPrompt ?? preset?.prompt ?? "",
    ratio: preset?.aspectRatio ?? defaultImageSettings.ratio,
  });
  const [references, setReferences] = useState<ReferenceImage[]>([]);
  const [generationKey, setGenerationKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [dockHeight, setDockHeight] = useState(104);
  const [workspaceView, setWorkspaceView] = useState<"canvas" | "history">("canvas");
  const [creativeOpen, setCreativeOpen] = useState(false);
  const [rerunRequest, setRerunRequest] = useState(0);
  const [compactPanel, setCompactPanel] = useState(false);
  const [guidance, setGuidance] = useState<CreativeGuidance>({ ...defaultCreativeGuidance });
  const [uploadError, setUploadError] = useState("");
  const panelUploadInput = useRef<HTMLInputElement>(null);
  const pendingReferenceRole = useRef<"subject" | "style">("subject");
  const urlsRef = useRef(new Set<string>());
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uploadRef = useRef<ReferenceUploadHandle>(null);
  const templateReferenceLoaded = useRef(false);
  const templateLoad = useRef<AbortController | null>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const localRequests = useRef(new Set<AbortController>());
  const dockRef = useRef<HTMLElement>(null);
  const referencePickerRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef({ start: 0, end: 0 });

  const { models, error: modelsError, retry: retryModels } = useImageModels();
  const signedIn = useSignedIn();
  const runEvents: RunEvents = {
    onDone: (run, created, onCanvas) => {
      const ready = `${created.length === 1 ? "Your image is" : `${created.length} images are`} ready`;
      if (onCanvas) {
        setAnnouncement(`${ready}.`);
        if (window.matchMedia("(max-width: 780px)").matches) {
          requestAnimationFrame(() =>
            resultsRef.current?.scrollIntoView({ block: "start", behavior: motionEnabled ? "smooth" : "instant" }),
          );
        }
        return;
      }
      // An earlier run never takes over the canvas; the user chooses when to look.
      notify(`${ready}: “${shortPrompt(run.prompt)}”`, {
        label: "View",
        icon: ArrowUpRight,
        run: () => {
          jobs.view(run.id);
          setWorkspaceView("canvas");
        },
      });
    },
    onFailed: (run, caught, onCanvas) => {
      if (isSessionEnded(caught)) {
        goToSignIn();
        return;
      }
      const message = generationError(caught);
      setAnnouncement(onCanvas ? message : "");
      if (onCanvas) return;
      notify(
        `“${shortPrompt(run.prompt)}” didn’t come through. ${message}`,
        run.canRetry ? { label: "Retry", run: () => jobs.retry(run.id) } : undefined,
      );
    },
    onStillRunning: () => {
      setAnnouncement("");
      notify("This is taking longer than usual. Your image will appear in History when it’s ready.");
    },
  };
  const jobs = useImageJobs(models, signedIn, sample, runEvents);
  const { favorites, hidden, toggleFavorite, hide, unhide } = useLibraryPrefs();
  // An unknown or missing model key (an old link, say) means the default model, else the first.
  const model =
    models?.find((item) => item.key === settings.model) ??
    models?.find((item) => item.key === DEFAULT_IMAGE_MODEL) ??
    models?.[0];
  const options = useMemo(
    () => (model ? resolveOptions(model, settings.options, settings.ratio) : {}),
    [model, settings.options, settings.ratio],
  );
  const maxReferences = model?.references?.max ?? 0;
  useEffect(() => {
    if (!initialReferences.length || maxReferences === 0 || templateReferenceLoaded.current) return;
    templateReferenceLoaded.current = true;
    const controller = new AbortController();
    urlsAsFiles(initialReferences.slice(0, maxReferences), controller.signal, "template-reference")
      .then((files) => uploadRef.current?.addFiles(files))
      .catch(() => undefined);
    return () => controller.abort();
  }, [initialReferences, maxReferences]);
  const credits = useCreditEstimate(model, options, Math.min(references.length, maxReferences));
  const items = useMemo(() => {
    const hiddenIds = new Set(hidden);
    const favoriteIds = new Set(favorites);
    return jobs.results
      .filter((item) => !hiddenIds.has(item.id))
      .map((item) => (favoriteIds.has(item.id) ? { ...item, favorite: true } : item));
  }, [jobs.results, hidden, favorites]);
  const running = runningCount(jobs.runs);
  const atRunLimit = running >= MAX_IMAGE_RUNS;
  const strip = workspaceView === "canvas" ? stripRuns(jobs.runs, jobs.viewing) : [];

  // An image sent here ("Edit" in another studio) waits for the models, then becomes a reference.
  const incoming = useRef<File | null>(null);
  useIncomingImage(
    "image",
    (file) => {
      if (models) editIncoming(file);
      else incoming.current = file;
    },
    () => notify("That image couldn’t be opened. Please upload it instead."),
  );
  useEffect(() => {
    if (!models || !incoming.current) return;
    const file = incoming.current;
    incoming.current = null;
    editIncoming(file);
    // Runs once the models arrive; editIncoming reads the latest settings itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [models]);

  // "Generate again" submits after the render that loaded the result's settings into the composer.
  useEffect(() => {
    if (rerunRequest > 0) formRef.current?.requestSubmit();
  }, [rerunRequest]);

  useLayoutEffect(() => {
    fitPromptHeight(promptRef.current);
  }, [settings.prompt, creativeOpen, compactPanel, workspaceView]);

  useEffect(() => {
    let frame = 0;
    const resize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => fitPromptHeight(promptRef.current));
    };
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1100px)");
    const update = () => setCompactPanel(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const dock = dockRef.current;
    if (!dock) return;
    const measure = () => setDockHeight(Math.ceil(dock.getBoundingClientRect().height));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(dock);
    return () => observer.disconnect();
  }, []);

  // Back from signing in: put the composer back as it was.
  useEffect(() => {
    let draft: Draft | null = null;
    try {
      const raw = window.sessionStorage.getItem(DRAFT_KEY);
      window.sessionStorage.removeItem(DRAFT_KEY);
      draft = raw ? (JSON.parse(raw) as Draft) : null;
    } catch {
      return;
    }
    if (!draft?.settings) return;
    // A one-time restore from storage the server can't see, so it can only happen after mounting.
    /* eslint-disable react-hooks/set-state-in-effect */
    setSettings({ ...defaultImageSettings, ...draft.settings });
    setGuidance({ ...defaultCreativeGuidance, ...draft.guidance });
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    const urls = urlsRef.current;
    const localFetches = localRequests.current;
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      for (const url of urls) URL.revokeObjectURL(url);
      for (const controller of localFetches) controller.abort();
    };
  }, []);

  useEffect(() => {
    const activeUrls = new Set(references.map((item) => item.url));
    for (const url of urlsRef.current) {
      if (!activeUrls.has(url)) {
        URL.revokeObjectURL(url);
        urlsRef.current.delete(url);
      }
    }
  }, [references]);

  function notify(text: string, action?: Feedback["action"]) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setFeedback({ text, action });
    toastTimer.current = setTimeout(() => setFeedback(null), action ? 9000 : 4500);
  }

  function focusPrompt(position?: number) {
    // Native dialogs must finish closing before outside content can receive focus.
    requestAnimationFrame(() => {
      const prompt = promptRef.current;
      if (!prompt) return;
      const caret = position ?? prompt.value.length;
      prompt.focus();
      prompt.setSelectionRange(caret, caret);
      selectionRef.current = { start: caret, end: caret };
    });
  }

  function updateSettings(patch: Partial<ImageSettings>) {
    setSettings((current) => ({ ...current, ...patch }));
    setError(null);
  }

  /** A picked size also becomes the preferred shape, so it carries over to another model. */
  function changeOption(field: string, value: ImageOptionValue) {
    setSettings((current) => ({
      ...current,
      options: { ...current.options, [field]: value },
      ...(field === model?.shape?.field ? { ratio: shapeOption(String(value)).ratio } : {}),
    }));
    setError(null);
  }

  function goToSignIn() {
    try {
      window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ settings, guidance } satisfies Draft));
    } catch {
      // Without storage the prompt is lost, but signing in still works.
    }
    const back = model ? `/image?model=${encodeURIComponent(model.key)}` : "/image";
    router.push(`/sign-in?next=${encodeURIComponent(back)}`);
  }

  /** `limit` is the selected model's reference limit, or the one about to be selected. */
  function addReferences(incoming: readonly ReferenceImage[], limit = maxReferences) {
    for (const item of incoming) urlsRef.current.add(item.url);
    setReferences((current) =>
      [...current, ...incoming.map((item) => ({ ...item, role: item.role ?? ("subject" as const) }))].slice(
        0,
        Math.max(limit, current.length),
      ),
    );
    pendingReferenceRole.current = "subject";
    setError(null);
  }

  function uploadReference(role: "subject" | "style" = "subject") {
    pendingReferenceRole.current = role;
    // The file control must live inside the active modal; its background is inert.
    if (creativeOpen && compactPanel) panelUploadInput.current?.click();
    else uploadRef.current?.openFilePicker(role);
  }

  function changeGuidance(patch: Partial<CreativeGuidance>) {
    setGuidance((current) => ({ ...current, ...patch }));
    setError(null);
  }

  function changeReferenceRole(id: string, role: "subject" | "style") {
    setReferences((current) => current.map((item) => (item.id === id ? { ...item, role } : item)));
    setError(null);
  }

  function removeReference(id: string) {
    const removedIndex = references.findIndex((item) => item.id === id);
    setReferences((current) => current.filter((item) => item.id !== id));
    if (removedIndex >= 0) {
      updateSettings({
        prompt: settings.prompt.replace(/@image(\d+)\b/g, (token, number: string) => {
          const index = Number(number) - 1;
          if (index === removedIndex) return "";
          return index > removedIndex && index < references.length ? `@image${index}` : token;
        }),
      });
    }
  }

  function rememberSelection() {
    const prompt = promptRef.current;
    if (prompt) selectionRef.current = { start: prompt.selectionStart, end: prompt.selectionEnd };
  }

  function insertReference(id: string) {
    const index = references.findIndex((item) => item.id === id);
    if (index < 0) return;
    const { start, end } = selectionRef.current;
    const before = settings.prompt.slice(0, start);
    const after = settings.prompt.slice(end);
    const token = `${before && !/\s$/.test(before) ? " " : ""}@image${index + 1}${after && /^\s/.test(after) ? "" : " "}`;
    const prompt = before + token + after;
    if (model && prompt.length > model.promptMaxLength) {
      notify("Make a little room in your prompt before adding a reference.");
      return;
    }
    updateSettings({ prompt });
    referencePickerRef.current?.hidePopover();
    focusPrompt(before.length + token.length);
  }

  function applyInspiration(id: string) {
    const inspiration = imageInspirations.find((item) => item.id === id);
    if (!inspiration) return;
    // Drop any picked size so the inspiration's shape applies.
    const options = { ...settings.options };
    if (model?.shape) delete options[model.shape.field];
    updateSettings({ prompt: inspiration.prompt, ratio: inspiration.aspectRatio, options });
    setWorkspaceView("canvas");
    focusPrompt();
    notify(`“${inspiration.title}” is your new starting point.`);
  }

  /**
   * A GPT Image 2 template: its prompt, with GPT Image 2 selected. Its sample
   * photos become the references, unless the user already added their own,
   * which the template then uses instead.
   */
  function applyTemplate(template: TemplateItem) {
    if (!template.prompt) return;
    const target = models?.find((candidate) => candidate.key === TEMPLATE_IMAGE_MODEL);
    updateSettings({ prompt: template.prompt, model: target?.key ?? TEMPLATE_IMAGE_MODEL });
    setWorkspaceView("canvas");
    focusPrompt();
    const samples = (template.referenceAssets ?? []).map((id) => landingAssets[id].image);
    if (!samples.length) {
      notify(`“${template.title}” is ready. Generate it, or change the prompt first.`);
      return;
    }
    if (references.length) {
      notify(`“${template.title}” is ready and will use your photo.`);
      return;
    }
    templateLoad.current?.abort();
    const controller = new AbortController();
    templateLoad.current = controller;
    localRequests.current.add(controller);
    urlsAsFiles(samples.slice(0, target?.references?.max ?? samples.length), controller.signal, "template-sample")
      .then((files) => uploadRef.current?.addFiles(files))
      .then(() => notify(`“${template.title}” is ready. Swap the sample photo for your own, then generate.`))
      .catch(() => {
        if (!controller.signal.aborted)
          notify("The template’s sample photo couldn’t load. Add your own photo instead.");
      })
      .finally(() => localRequests.current.delete(controller));
  }

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (document.activeElement instanceof Element && document.activeElement.closest("dialog")) return;
    if (!model) {
      setError(modelsError ? "The image models couldn’t load. Retry, then generate." : "Loading image models…");
      return;
    }
    if (!settings.prompt.trim()) {
      setError("Give your idea a few words first.");
      promptRef.current?.focus();
      return;
    }
    if (references.length > maxReferences) {
      const extra = references.length - maxReferences;
      setError(
        maxReferences
          ? `${model.name} takes up to ${maxReferences} reference ${maxReferences === 1 ? "image" : "images"}. Remove ${extra} to continue.`
          : `${model.name} doesn’t use reference images. Remove them, or choose a model that does.`,
      );
      return;
    }
    if (model.references?.required && references.length === 0) {
      setError(`${model.name} needs a reference image. Add one to continue.`);
      return;
    }
    const prompt = composeImagePrompt(settings.prompt, composeImageGuidance(settings.style, guidance, references));
    if (prompt.length > model.promptMaxLength) {
      setError(
        "Your brief and creative guidance are a little too long together. Shorten the brief or remove a creative option.",
      );
      promptRef.current?.focus();
      return;
    }
    if (signedIn === false && !sample) {
      goToSignIn();
      return;
    }
    if (atRunLimit) {
      setError(`You can make ${MAX_IMAGE_RUNS} at once. Generate again as soon as one finishes.`);
      return;
    }
    setGenerationKey((current) => current + 1);
    setWorkspaceView("canvas");
    setError(null);
    setAnnouncement(`Creating with ${model.name}.`);
    jobs.generate({ model, prompt, options, files: references.map((item) => item.file) });
  }

  /** Loads a result's prompt, model and settings into the composer. */
  function applyResult(item: ImageResult) {
    const parsed = parseImageGuidance(item.guidance);
    const shape = shapeOf(
      models?.find((candidate) => candidate.key === item.model),
      item.options,
    );
    updateSettings({
      prompt: item.prompt,
      model: item.model,
      style: parsed.style,
      ratio: shape?.ratio ?? settings.ratio,
      options: optionValues(item.options),
    });
    setGuidance({ lighting: parsed.lighting, palette: parsed.palette });
    setWorkspaceView("canvas");
  }

  function reuse(item: ImageResult) {
    applyResult(item);
    focusPrompt();
    notify("Prompt and settings are ready for another direction.");
  }

  /** Generates a result's prompt and settings again, once the composer holds them. */
  function rerun(item: ImageResult) {
    applyResult(item);
    setRerunRequest((current) => current + 1);
  }

  /** An image file becomes a subject reference, ready for an edit. */
  function addFileAsReference(file: File, limit = maxReferences, lead = "") {
    if (references.length >= limit) {
      notify("Remove a reference before adding another.");
      return;
    }
    addReferences(
      [
        {
          id: crypto.randomUUID(),
          url: URL.createObjectURL(file),
          name: file.name || "Generated image",
          mimeType: file.type,
          size: file.size,
          source: "result",
          file,
          role: "subject",
        },
      ],
      limit,
    );
    setWorkspaceView("canvas");
    focusPrompt();
    notify(`${lead}Reference added. Describe what you’d like to change.`);
  }

  async function addResultAsReference(item: ImageResult, limit = maxReferences, lead = "") {
    if (references.length >= limit) {
      notify("Remove a reference before adding another.");
      return;
    }
    const controller = new AbortController();
    localRequests.current.add(controller);
    try {
      const file = await resultAsFile(item, controller.signal);
      if (controller.signal.aborted) return;
      addFileAsReference(file, limit, lead);
    } catch {
      if (!controller.signal.aborted) notify("That image couldn’t be added. Please try again.");
    } finally {
      localRequests.current.delete(controller);
    }
  }

  /** An image sent from another studio ("Edit" on an upscaled image), once the models are known. */
  function editIncoming(file: File) {
    const target = model?.references ? model : models?.find((candidate) => candidate.references);
    if (!target?.references) {
      notify("None of the image models can edit an image right now.");
      return;
    }
    const switching = target.key !== model?.key;
    if (switching) updateSettings({ model: target.key });
    addFileAsReference(file, target.references.max, switching ? `Switched to ${target.name} for editing. ` : "");
  }

  /** The model "Edit" uses: the selected one if it takes references, else the result's own, else the first that does. */
  function editModelFor(item: ImageResult) {
    if (model?.references) return model;
    return (
      models?.find((candidate) => candidate.key === item.model && candidate.references) ??
      models?.find((candidate) => candidate.references)
    );
  }

  /** The image becomes a reference, with an empty brief for the change. */
  function editResult(item: ImageResult) {
    const target = editModelFor(item);
    if (!target?.references) return;
    const switching = target.key !== model?.key;
    // The brief that made the image would only make it again; an edit needs a new one.
    updateSettings({
      ...(switching ? { model: target.key } : {}),
      ...(settings.prompt.trim() === item.prompt.trim() ? { prompt: "" } : {}),
    });
    void addResultAsReference(item, target.references.max, switching ? `Switched to ${target.name} for editing. ` : "");
  }

  /** "Continue with": Edit stays here; Animate and Upscale take the image to their studio. */
  function continueWith(item: ImageResult, step: NextStep) {
    if (step === "edit") {
      editResult(item);
      return;
    }
    const target = step === "animate" ? "video" : "upscale";
    sendImage({ target, url: item.url, name: downloadName(item), mimeType: item.mimeType, prompt: item.prompt });
    router.push(handoffPaths[target]);
  }

  function deleteItems(ids: readonly string[]) {
    hide(ids);
    notify(`${ids.length === 1 ? "Image" : `${ids.length} images`} removed from your history.`, {
      label: "Undo",
      run: () => unhide(ids),
    });
  }

  const editing = references.length > 0;
  const guidancePrompt = composeImageGuidance(settings.style, guidance, references);
  const creativeCount =
    Number(settings.style !== "None") + Number(guidance.lighting !== "none") + Number(guidance.palette !== "none");
  // Edit needs a model that takes reference images.
  const nextSteps = resultNextSteps.filter(
    (step) => step.id !== "edit" || models?.some((candidate) => candidate.references),
  );
  const priceLabel = credits === null ? "…" : `${credits} ${credits === 1 ? "credit" : "credits"}`;
  const creativePanel = (
    <CreativePanel
      references={references}
      style={settings.style}
      lighting={guidance.lighting}
      palette={guidance.palette}
      inDialog={compactPanel}
      uploadError={compactPanel ? uploadError : ""}
      guidancePrompt={guidancePrompt}
      onStyleChange={(style) => updateSettings({ style })}
      onLightingChange={(lighting) => changeGuidance({ lighting })}
      onPaletteChange={(palette) => changeGuidance({ palette })}
      onRoleChange={changeReferenceRole}
      onUpload={uploadReference}
      onRemove={removeReference}
      onClose={() => setCreativeOpen(false)}
      maxReferences={maxReferences}
    />
  );
  return (
    <main
      className={styles.workspace}
      id="main-content"
      tabIndex={-1}
      data-creative-open={creativeOpen && !compactPanel}
      style={
        {
          "--image-dock-height": `${dockHeight}px`,
          "--image-runs-height": strip.length ? "72px" : "0px",
        } as CSSProperties
      }
    >
      <h1 className={styles.srOnly}>Pixel Magic image studio</h1>
      <div className={styles.mainColumn}>
        <section ref={resultsRef} className={styles.results} aria-label="Image canvas">
          <ImageResults
            variant="canvas"
            modelName={model?.name}
            workspaceView={workspaceView}
            onViewChange={setWorkspaceView}
            onOpenCreative={() => setCreativeOpen((current) => !current)}
            onHelp={() => setHelpOpen(true)}
            creativeOpen={creativeOpen}
            creativeCount={creativeCount}
            items={items}
            runs={jobs.runs}
            strip={strip}
            viewingRunId={jobs.viewing}
            onViewRun={jobs.view}
            onRetryRun={jobs.retry}
            onDismissRun={jobs.dismiss}
            generationKey={generationKey}
            models={models ?? undefined}
            onReuse={reuse}
            onRerun={atRunLimit ? undefined : rerun}
            nextSteps={nextSteps}
            onNextStep={continueWith}
            onReference={maxReferences > 0 ? addResultAsReference : undefined}
            onFavorite={toggleFavorite}
            onDelete={deleteItems}
            onSelectInspiration={applyInspiration}
            onSelectTemplate={applyTemplate}
          />
        </section>

        <div className={styles.composerBand} hidden={workspaceView === "history"}>
          <section ref={dockRef} className={styles.dock} aria-label="Image prompt composer">
            <form
              ref={formRef}
              onSubmit={generate}
              className={styles.dockForm}
              onKeyDown={(event) => {
                if (event.target instanceof Element && event.target.closest("dialog")) return;
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  event.preventDefault();
                  event.currentTarget.requestSubmit();
                }
              }}
              onPaste={(event) => {
                const files = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith("image/"));
                if (files.length) {
                  event.preventDefault();
                  void uploadRef.current?.addFiles(files);
                }
              }}
              onDragOver={(event) => {
                if (event.dataTransfer.types.includes("Files")) event.preventDefault();
              }}
              onDrop={(event) => {
                const files = Array.from(event.dataTransfer.files);
                if (files.length) {
                  event.preventDefault();
                  void uploadRef.current?.addFiles(files);
                }
              }}
            >
              <ReferenceUploader
                ref={uploadRef}
                variant="compact"
                className={styles.referenceRail}
                items={references}
                max={maxReferences}
                mimeTypes={model?.references?.mimeTypes}
                onAdd={addReferences}
                onRemove={removeReference}
                onError={setUploadError}
                editing={editing}
              />
              <div className={styles.promptField}>
                <label className={styles.srOnly} htmlFor="image-prompt">
                  {editing ? "Describe your image edit" : "Describe the image you imagine"}
                </label>
                <textarea
                  ref={promptRef}
                  id="image-prompt"
                  name="prompt"
                  value={settings.prompt}
                  maxLength={model?.promptMaxLength}
                  rows={1}
                  aria-describedby="prompt-preview-note"
                  aria-invalid={Boolean(error)}
                  aria-errormessage={error ? "image-prompt-error" : undefined}
                  placeholder={editing ? "Describe your edit…" : "Describe an image…"}
                  onSelect={rememberSelection}
                  onBlur={rememberSelection}
                  onChange={(event) => {
                    updateSettings({ prompt: event.target.value });
                    rememberSelection();
                  }}
                />
                {settings.prompt && (
                  <button
                    type="button"
                    className={styles.clearPrompt}
                    onClick={() => updateSettings({ prompt: "" })}
                    aria-label="Clear prompt"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                )}
              </div>

              {creativeCount > 0 && (
                <div className={styles.activeGuidance} aria-label="Selected creative guidance">
                  {settings.style !== "None" && (
                    <button
                      type="button"
                      onClick={() => updateSettings({ style: "None" })}
                      aria-label={`Remove ${settings.style} style`}
                    >
                      {settings.style}
                      <X size={11} aria-hidden="true" />
                    </button>
                  )}
                  {guidance.lighting !== "none" && (
                    <button
                      type="button"
                      onClick={() => changeGuidance({ lighting: "none" })}
                      aria-label="Remove lighting guidance"
                    >
                      {lightingOptions.find((item) => item.value === guidance.lighting)?.label}
                      <X size={11} aria-hidden="true" />
                    </button>
                  )}
                  {guidance.palette !== "none" && (
                    <button
                      type="button"
                      onClick={() => changeGuidance({ palette: "none" })}
                      aria-label="Remove palette guidance"
                    >
                      {paletteOptions.find((item) => item.value === guidance.palette)?.label}
                      <X size={11} aria-hidden="true" />
                    </button>
                  )}
                </div>
              )}
              <div className={styles.dockToolbar}>
                {maxReferences > 0 && (
                  <div className={styles.attachments} role="group" aria-label="Add image references">
                    <button
                      type="button"
                      onClick={() => uploadReference()}
                      aria-label="Upload reference images"
                      title="Add reference images"
                    >
                      <Plus size={19} aria-hidden="true" />
                    </button>
                    <span className={styles.attachmentDivider} aria-hidden="true" />
                    <button
                      type="button"
                      popoverTarget="image-reference-picker"
                      aria-haspopup="dialog"
                      onPointerDown={rememberSelection}
                      aria-label="Mention a reference image"
                      title="Mention a reference image"
                    >
                      <AtSign size={17} aria-hidden="true" />
                    </button>
                  </div>
                )}
                <div className={styles.toolbarScroll}>
                  {model && models ? (
                    <DockSettings
                      models={models}
                      model={model}
                      options={options}
                      onModelChange={(key) => updateSettings({ model: key })}
                      onOptionChange={changeOption}
                    />
                  ) : (
                    <p className={styles.modelStatus} role={modelsError ? "alert" : "status"}>
                      {modelsError ? (
                        <>
                          The image models couldn’t load.
                          <button type="button" onClick={retryModels}>
                            Retry
                          </button>
                        </>
                      ) : (
                        <>
                          <LoaderCircle size={13} className={styles.spinner} aria-hidden="true" />
                          Loading models…
                        </>
                      )}
                    </p>
                  )}
                </div>
              </div>

              <div className={styles.generateArea}>
                <button
                  type="submit"
                  className={styles.generate}
                  disabled={atRunLimit || !model}
                  aria-describedby={atRunLimit ? "image-run-limit" : undefined}
                  title={model ? `Uses ${priceLabel}` : undefined}
                  aria-label={
                    atRunLimit
                      ? `${MAX_IMAGE_RUNS} generations running`
                      : signedIn === false && !sample
                        ? "Sign in to generate"
                        : `${running ? "Generate another" : "Generate"}, ${credits === null ? "price loading" : priceLabel}`
                  }
                >
                  <span className={styles.generateLabel}>
                    {atRunLimit ? (
                      <>
                        <LoaderCircle size={16} className={styles.spinner} aria-hidden="true" />
                        {MAX_IMAGE_RUNS} creating
                      </>
                    ) : signedIn === false && !sample ? (
                      "Sign in to generate"
                    ) : running ? (
                      "Generate another"
                    ) : (
                      "Generate"
                    )}
                  </span>
                  {atRunLimit ? (
                    <span className={styles.generatePrice} id="image-run-limit">
                      One will finish soon
                    </span>
                  ) : (
                    model && (
                      <span className={styles.generatePrice}>
                        <Sparkles size={12} aria-hidden="true" />
                        {priceLabel}
                      </span>
                    )
                  )}
                </button>
              </div>
              {error && (
                <div className={styles.error} id="image-prompt-error" role="alert">
                  <Info size={14} aria-hidden="true" />
                  <p>{error}</p>
                </div>
              )}
              <p className={styles.srOnly} id="prompt-preview-note">
                Each generation uses the credits shown on the Generate button. Press Command or Control and Enter to
                submit.
              </p>
            </form>
          </section>
        </div>
      </div>
      {creativeOpen && !compactPanel && (
        <aside className={styles.panel} id="creative-options-panel" aria-label="Creative options">
          {creativePanel}
        </aside>
      )}
      <Modal
        open={creativeOpen && compactPanel}
        onClose={() => setCreativeOpen(false)}
        title="Creative options"
        className={styles.creativeModal}
      >
        <div
          onPaste={(event) => {
            const files = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith("image/"));
            if (files.length) {
              event.preventDefault();
              void uploadRef.current?.addFiles(files);
            }
          }}
          onDragOver={(event) => {
            if (event.dataTransfer.types.includes("Files")) event.preventDefault();
          }}
          onDrop={(event) => {
            const files = Array.from(event.dataTransfer.files);
            if (files.length) {
              event.preventDefault();
              void uploadRef.current?.addFiles(files);
            }
          }}
        >
          {creativePanel}
          <input
            ref={panelUploadInput}
            type="file"
            accept={REFERENCE_MIME_TYPES.join(",")}
            multiple
            hidden
            aria-label="Upload creative reference images"
            onChange={(event) => {
              void uploadRef.current?.addFiles(Array.from(event.target.files ?? []), pendingReferenceRole.current);
              event.currentTarget.value = "";
            }}
          />
        </div>
      </Modal>

      <div
        ref={referencePickerRef}
        id="image-reference-picker"
        popover="auto"
        role="dialog"
        aria-labelledby="reference-picker-title"
        className={styles.referencePicker}
      >
        <div className={styles.referencePickerHeader}>
          <h2 id="reference-picker-title">Reference an image</h2>
          <span>
            {references.length}/{maxReferences}
          </span>
        </div>
        {references.length ? (
          <>
            <p>Choose a reference to add it to your prompt.</p>
            <div className={styles.referenceChoices}>
              {references.map((item, index) => (
                <button type="button" key={item.id} onClick={() => insertReference(item.id)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.url} alt="" />
                  <span>
                    <strong>@image{index + 1}</strong>
                    <small>{item.name}</small>
                  </span>
                  <Plus size={14} aria-hidden="true" />
                </button>
              ))}
            </div>
          </>
        ) : (
          <p>Add an image first, then mention it in your prompt to describe how you’d like to use it.</p>
        )}
        <button
          type="button"
          className={styles.addReference}
          onClick={() => uploadReference()}
          disabled={references.length >= maxReferences}
        >
          <ImagePlus size={15} aria-hidden="true" />
          Add reference images
        </button>
      </div>

      <p className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
      {feedback && (
        <div className={styles.toast} role="status">
          <span>{feedback.text}</span>
          {feedback.action && (
            <button
              type="button"
              onClick={() => {
                feedback.action?.run();
                setFeedback(null);
              }}
            >
              <FeedbackIcon icon={feedback.action.icon} /> {feedback.action.label}
            </button>
          )}
          <button type="button" onClick={() => setFeedback(null)} aria-label="Dismiss notification">
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      <Modal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="A little help getting started"
        className={styles.helpModal}
      >
        <div className={styles.helpContent}>
          <span className={styles.helpMark}>
            <Sparkles size={25} aria-hidden="true" />
          </span>
          <h2>
            From a thought
            <br />
            to a new <em>point of view.</em>
          </h2>
          <ol>
            <li>
              <span>01</span>
              <div>
                <strong>Start with an idea.</strong>
                <p>Describe your image, or choose an inspiration card for a starting point.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Find your direction.</strong>
                <p>
                  Choose a model in the prompt bar, then its size and image count. Creative options adds optional style,
                  light and palette guidance; models that take references let you add images too.
                </p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>See the possibilities.</strong>
                <p>Generate, save favorites, reuse a prompt, and find everything you’ve made in History.</p>
              </div>
            </li>
          </ol>
          <div className={styles.helpNotice}>
            <Info size={17} aria-hidden="true" />
            <p>
              Each generation uses the credits shown on the Generate button, and failed generations return them. Your
              images are saved to your account; favorites and removals are kept in this browser.
            </p>
          </div>
          <button
            type="button"
            className="button-primary"
            onClick={() => {
              setHelpOpen(false);
              setWorkspaceView("canvas");
              focusPrompt();
            }}
          >
            Let’s explore <ArrowDownLeft size={16} aria-hidden="true" />
          </button>
        </div>
      </Modal>
    </main>
  );
}
