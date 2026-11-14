"use client";

import { ArrowDownToLine, ImagePlus, LoaderCircle, Replace, X } from "lucide-react";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { defaultUpscaleSettings, UPSCALE_SETTING_KEYS } from "@/lib/image-upscaler/models";
import type { UpscaleSettings } from "@/lib/image-upscaler/types";
import { UpscaleCompare } from "./UpscaleCompare";
import { UpscaleSettingsPanel } from "./UpscaleSettingsPanel";
import { UpscaleUploadWelcome } from "./UpscaleUploadWelcome";
import { useUpscale } from "./useUpscale";
import styles from "./main.module.css";

const dimensions = (width: number, height: number) => `${width.toLocaleString()} × ${height.toLocaleString()}`;

export function UpscaleWorkspace() {
  const { source, result, stage, error, setError, loadFile, upscale, cancel, reset } = useUpscale();
  const [settings, setSettings] = useState<UpscaleSettings>(() => ({ ...defaultUpscaleSettings }));
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadButtonRef = useRef<HTMLButtonElement>(null);
  const upscaleButtonRef = useRef<HTMLButtonElement>(null);
  const downloadRef = useRef<HTMLAnchorElement>(null);
  const replaceRef = useRef<HTMLButtonElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const wasBusy = useRef(false);
  const dropDepth = useRef(0);
  const busy = stage !== "idle";
  const input = source
    ? { width: source.width, height: source.height, contentType: source.file.type, size: source.file.size }
    : null;
  const resultIsCurrent = !!result && UPSCALE_SETTING_KEYS.every((key) => result.settings[key] === settings[key]);
  const fileBase =
    source?.file.name
      .replace(/\.[^.]+$/, "")
      .replace(/[^\p{L}\p{N}_-]+/gu, "-")
      .slice(0, 70) || "pixel-magic";

  useEffect(() => {
    if (wasBusy.current && !busy) {
      const pageScrolls = window.matchMedia("(max-width: 900px)").matches;
      if (pageScrolls && source && !result) {
        editorRef.current?.querySelector<HTMLElement>("aside summary")?.focus();
        wasBusy.current = busy;
        return;
      }
      const target = result ? downloadRef.current : source ? upscaleButtonRef.current : uploadButtonRef.current;
      if (target instanceof HTMLButtonElement && target.disabled)
        replaceRef.current?.focus({ preventScroll: !pageScrolls });
      else target?.focus({ preventScroll: !pageScrolls });
    }
    wasBusy.current = busy;
  }, [busy, result, source]);

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

  function selectFiles(files: FileList | null) {
    if (!files?.length) return;
    if (files.length > 1) {
      setError("Choose one image at a time.");
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

  const busyOverlay = busy && (
    <div className={styles.busyOverlay} role="status">
      <LoaderCircle className={styles.spinner} size={24} aria-hidden="true" />
      <strong>
        {stage === "loading"
          ? "Opening your image…"
          : stage === "preparing"
            ? "Preparing your preview…"
            : "Resizing your image…"}
      </strong>
      <button type="button" onClick={cancel} autoFocus>
        Cancel
      </button>
    </div>
  );

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

      {error && (
        <p className={styles.error} role="alert">
          {error}
          <button type="button" onClick={() => setError("")} aria-label="Dismiss error">
            <X size={15} />
          </button>
        </p>
      )}

      {source ? (
        <>
          <h1 className={styles.srOnly}>Image upscaler</h1>
          <div ref={editorRef} className={styles.editor}>
            <section className={styles.canvas} aria-label="Your image workspace">
              <div className={styles.canvasContent} inert={busy}>
                <header className={styles.toolbar}>
                  <div className={styles.fileInfo}>
                    <span className={styles.fileName} title={source.file.name}>
                      {source.file.name}
                    </span>
                    <span className={styles.imageSize}>
                      {dimensions(
                        result ? result.output.width : source.width,
                        result ? result.output.height : source.height,
                      )}{" "}
                      px
                    </span>
                  </div>
                  <div className={styles.actions}>
                    {result && (
                      <a
                        ref={downloadRef}
                        className={styles.download}
                        href={result.url}
                        download={`${fileBase}-${result.settings.upscale_factor}x.${result.output.format}`}
                      >
                        <ArrowDownToLine size={15} aria-hidden="true" />
                        <span>Download</span>
                      </a>
                    )}
                    <button
                      ref={replaceRef}
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      title="Replace image"
                      aria-label="Replace image"
                    >
                      <Replace size={16} />
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
                <div className={styles.imageStage}>
                  {result ? (
                    <UpscaleCompare
                      key={result.url}
                      originalUrl={source.url}
                      resultUrl={result.url}
                      width={result.output.width}
                      height={result.output.height}
                      resultLabel={`${result.settings.upscale_factor}× preview`}
                    />
                  ) : (
                    <>
                      {/* This browser-local file is never sent to an image optimizer. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className={styles.originalImage} src={source.url} alt="Your uploaded image" />
                      <span className={styles.originalBadge}>Original</span>
                    </>
                  )}
                </div>
              </div>
              {busyOverlay}
            </section>

            <UpscaleSettingsPanel
              settings={settings}
              onChange={setSettings}
              onReset={() => setSettings({ ...defaultUpscaleSettings })}
              busy={busy}
              source={input}
              onSubmit={() => {
                void upscale(settings);
              }}
              submitRef={upscaleButtonRef}
              resultIsCurrent={resultIsCurrent}
            />
          </div>
        </>
      ) : (
        <section className={styles.uploadStage} aria-label="Upload an image">
          <div className={styles.welcomeContent} inert={busy}>
            <UpscaleUploadWelcome onUpload={() => inputRef.current?.click()} busy={busy} uploadRef={uploadButtonRef} />
          </div>
          {busyOverlay}
        </section>
      )}

      {dragging && (
        <div className={styles.dropOverlay}>
          <ImagePlus size={34} strokeWidth={1.3} aria-hidden="true" />
          <strong>{source ? "Drop to replace your image" : "Drop your image here"}</strong>
        </div>
      )}
      <span className={styles.srOnly} aria-live="polite">
        {result && stage === "idle"
          ? `Your ${result.settings.upscale_factor} times preview is ready to compare and download.`
          : ""}
      </span>
    </main>
  );
}
