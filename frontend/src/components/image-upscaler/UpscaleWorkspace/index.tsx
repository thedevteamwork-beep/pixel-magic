"use client";

import { ImagePlus, LoaderCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { ApiError } from "@/lib/api/client";
import { downloadFile } from "@/lib/download";
import { isSessionEnded, messageForError } from "@/lib/generate/messages";
import { handoffPaths, sendImage, type HandoffTarget } from "@/lib/handoff/image";
import { useIncomingImage } from "@/lib/handoff/useIncomingImage";
import { defaultValues, formatScale, formatSize, jobValues, outputSize, scaleOf } from "@/lib/image-upscaler/models";
import type { ImageSize, UpscaleValue, UpscaleValues } from "@/lib/image-upscaler/types";
import { useSignedIn } from "@/lib/auth/useSignedIn";
import { upscaleNextSteps } from "../constants";
import { UpscaleCompare } from "./UpscaleCompare";
import { UpscaleResultBar } from "./UpscaleResultBar";
import { UpscaleSettingsPanel } from "./UpscaleSettingsPanel";
import { UpscaleUploadWelcome } from "./UpscaleUploadWelcome";
import { UpscaleStillRunningError, useUpscale } from "./useUpscale";
import { useUpscaleEstimate } from "./useUpscaleEstimate";
import { useUpscaleModels } from "./useUpscaleModels";
import styles from "./main.module.css";

const EXTENSIONS: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

function errorMessage(error: unknown): string {
  if (error instanceof UpscaleStillRunningError)
    return "This is taking longer than usual. It will finish in the background; try again in a few minutes.";
  if (error instanceof ApiError && error.code === "INSUFFICIENT_CREDITS")
    return "You don’t have enough credits for this upscale. Add credits on the Pricing page, or pick a smaller scale.";
  if (error instanceof Error && !(error instanceof ApiError) && error.name !== "JobFailedError") return error.message;
  return messageForError(error);
}

/** The settings as they were for a result, to tell whether the current ones differ. */
const sameValues = (a: UpscaleValues, b: UpscaleValues) =>
  Object.keys({ ...a, ...b }).every((key) => a[key] === b[key]);

export function UpscaleWorkspace({ sample = false }: { sample?: boolean }) {
  const router = useRouter();
  const signedIn = useSignedIn();
  const { models, error: modelsError, retry: retryModels } = useUpscaleModels();
  const { source, result, stage, error, setError, loadFile, upscale, cancel, reset } = useUpscale(models, sample);
  const [modelKey, setModelKey] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, UpscaleValues>>({});
  const [resultSize, setResultSize] = useState<{ url: string; size: ImageSize } | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadButtonRef = useRef<HTMLButtonElement>(null);
  const upscaleButtonRef = useRef<HTMLButtonElement>(null);
  const dropDepth = useRef(0);

  // The chosen model, else the result's, else the first.
  const model = models?.find((item) => item.key === (modelKey ?? result?.model)) ?? models?.[0] ?? undefined;
  // Each model keeps its own edits; a fresh result shows the settings that made it.
  const values = useMemo(() => (model ? { ...defaultValues(model), ...edits[model.key] } : {}), [model, edits]);
  const size = source ? { width: source.width, height: source.height } : null;
  const credits = useUpscaleEstimate(model, values, size);
  const busy = stage !== "idle";
  const measured = result && resultSize?.url === result.url ? resultSize.size : null;
  const expected = result && model?.key === result.model ? outputSize(model, result.values, size) : null;
  const stale = Boolean(
    result && model && (model.key !== result.model || !sameValues(jobValues(model, values), result.values)),
  );

  // A result's settings become the panel's, so "Upscale again" starts from them.
  useEffect(() => {
    if (!result || !models) return;
    const made = models.find((item) => item.key === result.model);
    if (!made) return;
    // The result arrives from outside the panel, so its settings are applied here.
    /* eslint-disable react-hooks/set-state-in-effect */
    setModelKey(made.key);
    setEdits((current) => ({ ...current, [made.key]: jobValues(made, result.values) }));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [result, models]);

  // Session ended mid-upscale: sign in, then come back here.
  useEffect(() => {
    if (isSessionEnded(error)) router.push(`/sign-in?next=${encodeURIComponent("/upscale")}`);
  }, [error, router]);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const file = Array.from(event.clipboardData?.files ?? []).find((item) => item.type.startsWith("image/"));
      if (!file) return;
      event.preventDefault();
      void loadFile(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [loadFile]);

  // An image sent from another studio ("Upscale" on a generated image) opens straight away.
  useIncomingImage(
    "upscale",
    (file) => void loadFile(file),
    () => setError(new Error("That image couldn’t be opened. Please upload it instead.")),
  );

  function selectFiles(files: FileList | null) {
    if (!files?.length) return;
    if (files.length > 1) {
      setError(new Error("Choose one image at a time."));
      return;
    }
    void loadFile(files[0]);
  }

  function drop(event: DragEvent) {
    event.preventDefault();
    dropDepth.current = 0;
    setDragging(false);
    selectFiles(event.dataTransfer.files);
  }

  function changeValue(field: string, value: UpscaleValue) {
    if (!model) return;
    setEdits((current) => ({ ...current, [model.key]: { ...values, [field]: value } }));
  }

  function submit() {
    if (!model || !source) return;
    if (signedIn === false && !sample) {
      router.push(`/sign-in?next=${encodeURIComponent("/upscale")}`);
      return;
    }
    void upscale(model, values);
  }

  function download() {
    if (!result || !source) return;
    const base =
      source.file.name
        .replace(/\.[^.]+$/, "")
        .replace(/[^\p{L}\p{N}_-]+/gu, "-")
        .slice(0, 60) || "image";
    const scale = model ? scaleOf(model, result.values, size) : null;
    void downloadFile(
      result.url,
      `${base}-upscaled${scale ? `-${formatScale(scale).replace("×", "x")}` : ""}.${EXTENSIONS[result.mimeType] ?? "png"}`,
    );
  }

  function continueWith(step: string) {
    if (!result || !source) return;
    const target: HandoffTarget = step === "animate" ? "video" : "image";
    sendImage({
      target,
      url: result.url,
      name: `${source.file.name.replace(/\.[^.]+$/, "")}-upscaled.${EXTENSIONS[result.mimeType] ?? "png"}`,
      mimeType: result.mimeType,
    });
    router.push(handoffPaths[target]);
  }

  const busyLabel = stage === "loading" ? "Opening…" : stage === "uploading" ? "Uploading…" : "Upscaling…";
  const expectedOutput = model ? outputSize(model, values, size) : null;

  return (
    <main
      id="main-content"
      className={styles.workspace}
      tabIndex={-1}
      data-has-image={Boolean(source)}
      data-dragging={dragging}
      onDragEnter={(event) => {
        event.preventDefault();
        if (event.dataTransfer.types.includes("Files")) {
          dropDepth.current += 1;
          setDragging(true);
        }
      }}
      onDragLeave={() => {
        dropDepth.current = Math.max(0, dropDepth.current - 1);
        if (!dropDepth.current) setDragging(false);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDrop={drop}
    >
      <input
        ref={inputRef}
        className={styles.srOnly}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        tabIndex={-1}
        aria-label="Upload an image to upscale"
        onChange={(event) => {
          selectFiles(event.currentTarget.files);
          event.currentTarget.value = "";
        }}
      />

      {Boolean(error || modelsError) && !isSessionEnded(error) && (
        <p className={styles.error} role="alert">
          {error ? errorMessage(error) : "The upscale models couldn’t load."}
          {!error && Boolean(modelsError) ? (
            <button type="button" onClick={retryModels}>
              Retry
            </button>
          ) : (
            <button type="button" onClick={() => setError(null)} aria-label="Dismiss error">
              <X size={15} />
            </button>
          )}
        </p>
      )}

      {source ? (
        <>
          <h1 className={styles.srOnly}>Image upscaler</h1>
          <div className={styles.editor}>
            {model && models ? (
              <UpscaleSettingsPanel
                models={models}
                model={model}
                values={values}
                onModelChange={setModelKey}
                onValueChange={changeValue}
                onReset={() => setEdits((current) => ({ ...current, [model.key]: {} }))}
                source={size}
                credits={credits}
                busy={busy}
                busyLabel={busyLabel}
                onSubmit={submit}
                submitRef={upscaleButtonRef}
                hasResult={Boolean(result)}
                changed={stale}
              />
            ) : (
              <aside className={styles.panel} aria-label="Upscale settings" aria-busy={!modelsError}>
                <p className={styles.startHint}>{modelsError ? "The models couldn’t load." : "Loading models…"}</p>
              </aside>
            )}

            <section className={styles.canvas} aria-label="Your image workspace">
              <div className={styles.canvasContent} inert={stage === "loading"}>
                <header className={styles.toolbar}>
                  {result ? (
                    <UpscaleResultBar
                      result={result}
                      before={source}
                      after={measured ?? expected}
                      nextSteps={upscaleNextSteps}
                      onNextStep={continueWith}
                      onDownload={download}
                    />
                  ) : (
                    <div className={styles.fileInfo}>
                      <span className={styles.fileName} title={source.file.name}>
                        {source.file.name}
                      </span>
                      <span className={styles.imageSize}>{formatSize(source)} px</span>
                    </div>
                  )}
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.newImage}
                      onClick={() => inputRef.current?.click()}
                      disabled={busy}
                    >
                      <ImagePlus size={15} aria-hidden="true" />
                      New image
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        reset();
                        requestAnimationFrame(() => uploadButtonRef.current?.focus());
                      }}
                      title="Remove image"
                      aria-label="Remove image"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </header>
                <div className={styles.imageStage} data-working={stage === "upscaling" || stage === "uploading"}>
                  {result ? (
                    <UpscaleCompare
                      key={result.url}
                      originalUrl={source.url}
                      resultUrl={result.url}
                      width={source.width}
                      height={source.height}
                      originalLabel={`Before · ${formatSize(source)}`}
                      resultLabel={`After · ${formatSize(measured ?? expected ?? source)}`}
                      onResultSize={(next) => setResultSize({ url: result.url, size: next })}
                    />
                  ) : (
                    <>
                      {/* This browser-local file is never sent to an image optimizer. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className={styles.originalImage} src={source.url} alt="Your uploaded image" />
                      <span className={styles.originalBadge}>Original · {formatSize(source)}</span>
                    </>
                  )}
                  {(stage === "uploading" || stage === "upscaling") && model && (
                    <div className={styles.working} role="status">
                      <span className={styles.scanLine} aria-hidden="true" />
                      <div className={styles.workingCard}>
                        <LoaderCircle size={18} className={styles.spinner} aria-hidden="true" />
                        <strong>
                          {stage === "uploading" ? "Uploading your image…" : `${model.name} is adding detail…`}
                        </strong>
                        <span>
                          {expectedOutput ? `${formatSize(source)} → ${formatSize(expectedOutput)} px · ` : ""}
                          Usually 10–40 seconds
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {stage === "loading" && (
                <div className={styles.busyOverlay} role="status">
                  <LoaderCircle className={styles.spinner} size={24} aria-hidden="true" />
                  <strong>Opening your image…</strong>
                  <button type="button" onClick={cancel} autoFocus>
                    Cancel
                  </button>
                </div>
              )}
            </section>
          </div>
        </>
      ) : (
        <section className={styles.uploadStage} aria-label="Upload an image">
          <div className={styles.welcomeContent} inert={busy}>
            <UpscaleUploadWelcome onUpload={() => inputRef.current?.click()} busy={busy} uploadRef={uploadButtonRef} />
          </div>
          {stage === "loading" && (
            <div className={styles.busyOverlay} role="status">
              <LoaderCircle className={styles.spinner} size={24} aria-hidden="true" />
              <strong>Opening your image…</strong>
              <button type="button" onClick={cancel} autoFocus>
                Cancel
              </button>
            </div>
          )}
        </section>
      )}

      {dragging && (
        <div className={styles.dropOverlay}>
          <ImagePlus size={34} strokeWidth={1.3} aria-hidden="true" />
          <strong>{source ? "Drop to upscale another image" : "Drop your image here"}</strong>
        </div>
      )}
      <span className={styles.srOnly} aria-live="polite">
        {result && stage === "idle" ? "Your upscaled image is ready to compare and download." : ""}
      </span>
    </main>
  );
}
