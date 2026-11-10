"use client";

import { ArrowDownLeft, AtSign, ImagePlus, Info, LoaderCircle, Plus, RotateCcw, Sparkles, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { defaultImageSettings, imageInspirations, imageModels, MAX_PROMPT_LENGTH, MAX_REFERENCE_IMAGES, qualities, REFERENCE_MIME_TYPES } from "@/constants/image-generator";
import { landingAssets } from "@/constants/landing-media";
import { composeImageGuidance, composeImagePrompt, defaultCreativeGuidance, rebindReferenceMentions, type CreativeGuidance } from "@/lib/image-generator/guidance";
import { lightingOptions, paletteOptions } from "@/constants/image-guidance";
import { ImagePreviewError, requestImagePreview } from "@/lib/image-generator/client";
import type { ImageResult, ImageSettings, ReferenceImage } from "@/types/image-generator";
import { Modal } from "@/components/landing/Modal";
import { useLandingMotion } from "@/components/landing/LandingProvider";
import { CreativePanel } from "./CreativePanel";
import { DockSettings } from "./DockSettings";
import { ImageResults } from "./ImageResults";
import { ReferenceUploader, type ReferenceUploadHandle } from "./ReferenceUploader";
import styles from "./ImageWorkspace.module.css";

type Feedback = { text: string; deleted?: ImageResult[] };

function fitPromptHeight(prompt: HTMLTextAreaElement | null) {
  if (!prompt || !prompt.getClientRects().length) return;
  prompt.style.height = "auto";
  prompt.style.height = `${Math.min(prompt.scrollHeight, 104)}px`;
}

export function ImageWorkspace({ initialModel, initialPreset }: { initialModel: string; initialPreset: string | null }) {
  const { motionEnabled } = useLandingMotion();
  const preset = imageInspirations.find((item) => item.id === initialPreset);
  const [settings, setSettings] = useState<ImageSettings>({ ...defaultImageSettings, model: initialModel, prompt: preset?.prompt ?? "", aspectRatio: preset?.aspectRatio ?? defaultImageSettings.aspectRatio });
  const [references, setReferences] = useState<ReferenceImage[]>([]);
  const [items, setItems] = useState<ImageResult[]>([]);
  const [pending, setPending] = useState(false);
  const [pendingCount, setPendingCount] = useState(1);
  const [generationKey, setGenerationKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [dockHeight, setDockHeight] = useState(104);
  const [workspaceView, setWorkspaceView] = useState<"canvas" | "history">("canvas");
  const [creativeOpen, setCreativeOpen] = useState(false);
  const [compactPanel, setCompactPanel] = useState(false);
  const [guidance, setGuidance] = useState<CreativeGuidance>({ ...defaultCreativeGuidance });
  const [uploadError, setUploadError] = useState("");
  const panelUploadInput = useRef<HTMLInputElement>(null);
  const pendingReferenceRole = useRef<"subject" | "style">("subject");
  const generationGuidance = useRef(new Map<string, { guidance: CreativeGuidance; referenceIds: string[] }>());
  const requestRef = useRef<AbortController | null>(null);
  const urlsRef = useRef(new Set<string>());
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uploadRef = useRef<ReferenceUploadHandle>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const localRequests = useRef(new Set<AbortController>());
  const dockRef = useRef<HTMLElement>(null);
  const referencePickerRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef({ start: 0, end: 0 });

  useLayoutEffect(() => { fitPromptHeight(promptRef.current); }, [settings.prompt, creativeOpen, compactPanel, workspaceView]);

  useEffect(() => {
    let frame = 0;
    const resize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => fitPromptHeight(promptRef.current));
    };
    window.addEventListener("resize", resize);
    return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(frame); };
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

  useEffect(() => {
    const urls = urlsRef.current;
    const localFetches = localRequests.current;
    return () => {
      requestRef.current?.abort();
      if (toastTimer.current) clearTimeout(toastTimer.current);
      for (const url of urls) URL.revokeObjectURL(url);
      for (const controller of localFetches) controller.abort();
    };
  }, []);

  useEffect(() => {
    const activeUrls = new Set(references.filter((item) => item.source === "upload").map((item) => item.url));
    for (const url of urlsRef.current) {
      if (!activeUrls.has(url)) { URL.revokeObjectURL(url); urlsRef.current.delete(url); }
    }
  }, [references]);

  function notify(text: string, deleted?: ImageResult[]) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setFeedback({ text, deleted });
    toastTimer.current = setTimeout(() => setFeedback(null), deleted ? 9000 : 4500);
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
    setSettings((current) => {
      const next = { ...current, ...patch };
      return {
        ...next,
        quality: qualities.some((quality) => quality === next.quality) ? next.quality : defaultImageSettings.quality,
        // Removed preferences are fixed transport defaults, never hidden UI choices.
        queue: defaultImageSettings.queue, seed: null, negativePrompt: "", enhancePrompt: false,
        private: true, format: defaultImageSettings.format, background: defaultImageSettings.background,
      };
    });
    setError(null);
    setRequestError(null);
  }

  function addReferences(incoming: readonly ReferenceImage[]) {
    for (const item of incoming) if (item.source === "upload") urlsRef.current.add(item.url);
    setReferences((current) => [...current, ...incoming.map((item) => ({ ...item, role: item.role ?? "subject" as const }))].slice(0, MAX_REFERENCE_IMAGES));
    pendingReferenceRole.current = "subject";
    setError(null);
    setRequestError(null);
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
    setRequestError(null);
  }

  function changeReferenceRole(id: string, role: "subject" | "style") {
    setReferences((current) => current.map((item) => item.id === id ? { ...item, role } : item));
    setError(null);
  }

  function removeReference(id: string) {
    const removedIndex = references.findIndex((item) => item.id === id);
    setReferences((current) => current.filter((item) => item.id !== id));
    if (removedIndex >= 0) {
      updateSettings({ prompt: settings.prompt.replace(/@image(\d+)\b/g, (token, number: string) => {
        const index = Number(number) - 1;
        if (index === removedIndex) return "";
        return index > removedIndex && index < references.length ? `@image${index}` : token;
      }) });
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
    if (prompt.length > MAX_PROMPT_LENGTH) { notify("Make a little room in your prompt before adding a reference."); return; }
    updateSettings({ prompt });
    referencePickerRef.current?.hidePopover();
    focusPrompt(before.length + token.length);
  }

  function useInspiration(id: string) {
    const inspiration = imageInspirations.find((item) => item.id === id);
    if (!inspiration) return;
    updateSettings({ prompt: inspiration.prompt, aspectRatio: inspiration.aspectRatio });
    setWorkspaceView("canvas");
    focusPrompt();
    notify(`“${inspiration.title}” is your new starting point.`);
  }

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (document.activeElement instanceof Element && document.activeElement.closest("dialog")) return;
    if (requestRef.current) return;
    if (!settings.prompt.trim()) { setError("Give your idea a few words first."); promptRef.current?.focus(); return; }
    const submittedSettings: ImageSettings = {
      ...settings,
      mode: references.length ? "edit" : "create",
      quality: qualities.some((quality) => quality === settings.quality) ? settings.quality : defaultImageSettings.quality,
      queue: defaultImageSettings.queue, seed: null, negativePrompt: "", enhancePrompt: false,
      private: true, format: defaultImageSettings.format, background: defaultImageSettings.background,
    };
    const submittedGuidance = { ...guidance };
    const submittedPrompt = composeImagePrompt(settings.prompt, composeImageGuidance(settings.style, guidance, references));
    if (submittedPrompt.length > MAX_PROMPT_LENGTH) {
      setError("Your brief and creative guidance are a little too long together. Shorten the brief or remove a creative option.");
      promptRef.current?.focus();
      return;
    }
    const controller = new AbortController();
    requestRef.current = controller;
    setPending(true);
    setPendingCount(settings.count);
    setGenerationKey((current) => current + 1);
    setWorkspaceView("canvas");
    setError(null);
    setRequestError(null);
    setAnnouncement(`Preparing ${settings.count === 1 ? "a sample preview" : `${settings.count} sample previews`}.`);
    try {
      const response = await requestImagePreview({ ...submittedSettings, prompt: submittedPrompt, references: references.map(({ id, mimeType, size }) => ({ id, mimeType, size })) }, controller.signal);
      if (controller.signal.aborted || requestRef.current !== controller) return;
      for (const image of response.images) generationGuidance.current.set(image.id, { guidance: submittedGuidance, referenceIds: references.map((reference) => reference.id) });
      // Keep a bounded snapshot so reusing a preview never appends stale guidance.
      while (generationGuidance.current.size > 200) generationGuidance.current.delete(generationGuidance.current.keys().next().value!);
      const previews = response.images.map((image) => ({ ...image, prompt: submittedSettings.prompt }));
      setItems((current) => [...previews, ...current].slice(0, 60));
      setAnnouncement(`${response.images.length} sample ${response.images.length === 1 ? "preview is" : "previews are"} ready. No credits were used.`);
      if (window.matchMedia("(max-width: 780px)").matches) {
        requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ block: "start", behavior: motionEnabled ? "smooth" : "instant" }));
      }
    } catch (caught) {
      if (controller.signal.aborted) return;
      setRequestError(caught instanceof ImagePreviewError ? caught.message : "Something interrupted your preview. Please try again.");
      setAnnouncement("");
    } finally {
      if (requestRef.current === controller) { requestRef.current = null; setPending(false); }
    }
  }

  function cancel() {
    requestRef.current?.abort();
    requestRef.current = null;
    setPending(false);
    setAnnouncement("Preview canceled. Your prompt and settings are still here.");
  }

  function reuse(item: ImageResult) {
    const model = imageModels.find((candidate) => candidate.id === item.model || candidate.name === item.model);
    const snapshot = generationGuidance.current.get(item.id);
    const rebound = rebindReferenceMentions(item.prompt, snapshot?.referenceIds ?? [], references.map((reference) => reference.id));
    updateSettings({ prompt: rebound.prompt, model: model?.id ?? settings.model, aspectRatio: item.aspectRatio, resolution: item.resolution, quality: item.quality, style: item.style });
    setGuidance({ ...(snapshot?.guidance ?? defaultCreativeGuidance) });
    setWorkspaceView("canvas");
    focusPrompt();
    notify(rebound.removed ? "Prompt reused. Missing reference mentions were removed; add those images again or update the brief." : "Prompt and settings are ready for another direction.");
  }

  async function useReference(item: ImageResult) {
    if (references.length >= MAX_REFERENCE_IMAGES) { notify("Remove a reference before adding another."); return; }
    if (!Object.values(landingAssets).some((asset) => asset.image === item.url)) return;
    const controller = new AbortController();
    localRequests.current.add(controller);
    try {
      const response = await fetch(item.url, { signal: controller.signal });
      if (!response.ok) throw new Error("Sample unavailable");
      const sample = await response.blob();
      if (controller.signal.aborted) return;
      addReferences([{ id: crypto.randomUUID(), url: item.url, name: "Sample reference", mimeType: "image/jpeg", size: sample.size, source: "sample", role: "subject" }]);
      setWorkspaceView("canvas");
      focusPrompt();
      notify("Reference added. Describe what you’d like to change.");
    } catch { if (!controller.signal.aborted) notify("That sample couldn’t be added. Please try again."); }
    finally { localRequests.current.delete(controller); }
  }

  function deleteItems(ids: readonly string[]) {
    const selected = new Set(ids);
    const deleted = items.filter((item) => selected.has(item.id));
    setItems((current) => current.filter((item) => !selected.has(item.id)));
    notify(`${deleted.length === 1 ? "Preview" : `${deleted.length} previews`} removed.`, deleted);
  }

  function undoDelete() {
    if (!feedback?.deleted) return;
    const deleted = feedback.deleted;
    setItems((current) => [...deleted, ...current].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 60));
    setFeedback(null);
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }

  const selectedModel = imageModels.find((item) => item.id === settings.model) ?? imageModels[0];
  const editing = references.length > 0;
  const guidancePrompt = composeImageGuidance(settings.style, guidance, references);
  const creativeCount = Number(settings.style !== "None") + Number(guidance.lighting !== "none") + Number(guidance.palette !== "none");
  const creativePanel = <CreativePanel references={references} style={settings.style} lighting={guidance.lighting} palette={guidance.palette}
    inDialog={compactPanel} uploadError={compactPanel ? uploadError : ""}
    guidancePrompt={guidancePrompt} onStyleChange={(style) => updateSettings({ style })}
    onLightingChange={(lighting) => changeGuidance({ lighting })} onPaletteChange={(palette) => changeGuidance({ palette })}
    onRoleChange={changeReferenceRole} onUpload={uploadReference} onRemove={removeReference} onClose={() => setCreativeOpen(false)} maxReferences={MAX_REFERENCE_IMAGES} />;
  return <main className={styles.workspace} id="main-content" tabIndex={-1} data-creative-open={creativeOpen && !compactPanel}
    style={{ "--image-dock-height": `${dockHeight}px` } as CSSProperties}>
    <h1 className={styles.srOnly}>Pixel Magic image studio</h1>
    <div className={styles.mainColumn}>
    <section ref={resultsRef} className={styles.results} aria-label="Image canvas">
      <ImageResults variant="canvas" modelName={selectedModel.name} workspaceView={workspaceView} onViewChange={setWorkspaceView}
        onOpenCreative={() => setCreativeOpen((current) => !current)} onHelp={() => setHelpOpen(true)} creativeOpen={creativeOpen} creativeCount={creativeCount} items={items} pending={pending} pendingCount={pendingCount}
        generationKey={generationKey} onReuse={reuse} onReference={useReference}
        onFavorite={(id) => setItems((current) => current.map((item) => item.id === id ? { ...item, favorite: !item.favorite } : item))}
        onDelete={deleteItems} onSelectInspiration={useInspiration} error={requestError} onRetry={() => formRef.current?.requestSubmit()} />
    </section>

    <div className={styles.composerBand} hidden={workspaceView === "history"}>
    <section ref={dockRef} className={styles.dock} aria-label="Image prompt composer">
      <form ref={formRef} onSubmit={generate} className={styles.dockForm} onKeyDown={(event) => {
        if (event.target instanceof Element && event.target.closest("dialog")) return;
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") { event.preventDefault(); event.currentTarget.requestSubmit(); }
      }} onPaste={(event) => {
        const files = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith("image/"));
        if (files.length) { event.preventDefault(); void uploadRef.current?.addFiles(files); }
      }} onDragOver={(event) => {
        if (event.dataTransfer.types.includes("Files")) event.preventDefault();
      }} onDrop={(event) => {
        const files = Array.from(event.dataTransfer.files);
        if (files.length) { event.preventDefault(); void uploadRef.current?.addFiles(files); }
      }}>
        <ReferenceUploader ref={uploadRef} variant="compact" className={styles.referenceRail} items={references}
          onAdd={addReferences} onRemove={removeReference} onError={setUploadError} editing={editing} />
        <div className={styles.promptField}>
          <label className={styles.srOnly} htmlFor="image-prompt">{editing ? "Describe your image edit" : "Describe the image you imagine"}</label>
          <textarea ref={promptRef} id="image-prompt" name="prompt" value={settings.prompt} maxLength={MAX_PROMPT_LENGTH} rows={1}
            aria-describedby="prompt-preview-note" aria-invalid={Boolean(error)} aria-errormessage={error ? "image-prompt-error" : undefined}
            placeholder={editing ? "Describe your edit…" : "Describe an image…"}
            onSelect={rememberSelection} onBlur={rememberSelection}
            onChange={(event) => { updateSettings({ prompt: event.target.value }); rememberSelection(); }} />
          {settings.prompt && <button type="button" className={styles.clearPrompt} onClick={() => updateSettings({ prompt: "" })} aria-label="Clear prompt"><X size={14} aria-hidden="true" /></button>}
        </div>

        {creativeCount > 0 && <div className={styles.activeGuidance} aria-label="Selected creative guidance">
          {settings.style !== "None" && <button type="button" onClick={() => updateSettings({ style: "None" })} aria-label={`Remove ${settings.style} style`}>{settings.style}<X size={11} aria-hidden="true" /></button>}
          {guidance.lighting !== "none" && <button type="button" onClick={() => changeGuidance({ lighting: "none" })} aria-label="Remove lighting guidance">{lightingOptions.find((item) => item.value === guidance.lighting)?.label}<X size={11} aria-hidden="true" /></button>}
          {guidance.palette !== "none" && <button type="button" onClick={() => changeGuidance({ palette: "none" })} aria-label="Remove palette guidance">{paletteOptions.find((item) => item.value === guidance.palette)?.label}<X size={11} aria-hidden="true" /></button>}
        </div>}
        <div className={styles.dockToolbar}>
          <div className={styles.attachments} role="group" aria-label="Add image references">
            <button type="button" onClick={() => uploadReference()} aria-label="Upload reference images" title="Add reference images"><Plus size={19} aria-hidden="true" /></button>
            <span className={styles.attachmentDivider} aria-hidden="true" />
            <button type="button" popoverTarget="image-reference-picker" aria-haspopup="dialog" onPointerDown={rememberSelection}
              aria-label="Mention a reference image" title="Mention a reference image"><AtSign size={17} aria-hidden="true" /></button>
          </div>
          <div className={styles.toolbarScroll}><DockSettings settings={settings} onChange={updateSettings} /></div>
        </div>

        <div className={styles.generateArea}>
          <button type="submit" className={styles.generate} disabled={pending} title="Generate a sample preview · 0 credits" aria-label={pending ? "Preparing sample preview" : "Generate sample preview, zero credits"}>
            {pending ? <><LoaderCircle size={16} className={styles.spinner} aria-hidden="true" /><span>Preparing…</span></> : <><Sparkles size={16} aria-hidden="true" /><span>Generate</span></>}
            {!pending && <span className={styles.generatePrice}>0 credits</span>}
          </button>
          {pending && <button type="button" className={styles.cancel} onClick={cancel}>Cancel preview</button>}
        </div>
        {error && <div className={styles.error} id="image-prompt-error" role="alert"><Info size={14} aria-hidden="true" /><p>{error}</p></div>}
        <p className={styles.srOnly} id="prompt-preview-note">Sample image preview. No credits are used. Press Command or Control and Enter to submit.</p>
      </form>
    </section>
    </div>
    </div>
    {creativeOpen && !compactPanel && <aside className={styles.panel} id="creative-options-panel" aria-label="Creative options">{creativePanel}</aside>}
    <Modal open={creativeOpen && compactPanel} onClose={() => setCreativeOpen(false)} title="Creative options" className={styles.creativeModal}>
      <div onPaste={(event) => {
        const files = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith("image/"));
        if (files.length) { event.preventDefault(); void uploadRef.current?.addFiles(files); }
      }} onDragOver={(event) => {
        if (event.dataTransfer.types.includes("Files")) event.preventDefault();
      }} onDrop={(event) => {
        const files = Array.from(event.dataTransfer.files);
        if (files.length) { event.preventDefault(); void uploadRef.current?.addFiles(files); }
      }}>
      {creativePanel}
      <input ref={panelUploadInput} type="file" accept={REFERENCE_MIME_TYPES.join(",")} multiple hidden aria-label="Upload creative reference images"
        onChange={(event) => { void uploadRef.current?.addFiles(Array.from(event.target.files ?? []), pendingReferenceRole.current); event.currentTarget.value = ""; }} />
      </div>
    </Modal>

    <div ref={referencePickerRef} id="image-reference-picker" popover="auto" role="dialog" aria-labelledby="reference-picker-title" className={styles.referencePicker}>
      <div className={styles.referencePickerHeader}><h2 id="reference-picker-title">Reference an image</h2><span>{references.length}/{MAX_REFERENCE_IMAGES}</span></div>
      {references.length ? <>
        <p>Choose a reference to add it to your prompt.</p>
        <div className={styles.referenceChoices}>{references.map((item, index) => <button type="button" key={item.id} onClick={() => insertReference(item.id)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.url} alt="" /><span><strong>@image{index + 1}</strong><small>{item.name}</small></span><Plus size={14} aria-hidden="true" />
        </button>)}</div>
      </> : <p>Add an image first, then mention it in your prompt to describe how you’d like to use it.</p>}
      <button type="button" className={styles.addReference} onClick={() => uploadReference()} disabled={references.length >= MAX_REFERENCE_IMAGES}><ImagePlus size={15} aria-hidden="true" />Add reference images</button>
    </div>

    <p className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
    {feedback && <div className={styles.toast} role="status"><span>{feedback.text}</span>{feedback.deleted && <button type="button" onClick={undoDelete}><RotateCcw size={13} aria-hidden="true" /> Undo</button>}<button type="button" onClick={() => setFeedback(null)} aria-label="Dismiss notification"><X size={14} aria-hidden="true" /></button></div>}

    <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title="A little help getting started" className={styles.helpModal}>
      <div className={styles.helpContent}>
        <span className={styles.helpMark}><Sparkles size={25} aria-hidden="true" /></span>
        <h2>From a thought<br />to a new <em>point of view.</em></h2>
        <ol><li><span>01</span><div><strong>Start with an idea.</strong><p>Describe your image, or choose an inspiration card for a starting point.</p></div></li>
          <li><span>02</span><div><strong>Find your direction.</strong><p>Add references and choose your model, frame, quality, resolution, and image count in the prompt bar. Creative options adds optional style guidance.</p></div></li>
          <li><span>03</span><div><strong>See the possibilities.</strong><p>Create sample previews, save favorites, reuse a prompt, or bring an image back as a reference.</p></div></li></ol>
        <div className={styles.helpNotice}><Info size={17} aria-hidden="true" /><p>This is a design preview. Results use existing sample photographs, not AI-generated images. No credits are charged. References stay in this browser. Downloads are the original sample JPGs.</p></div>
        <button type="button" className="button-primary" onClick={() => { setHelpOpen(false); setWorkspaceView("canvas"); focusPrompt(); }}>Let’s explore <ArrowDownLeft size={16} aria-hidden="true" /></button>
      </div>
    </Modal>
  </main>;
}
