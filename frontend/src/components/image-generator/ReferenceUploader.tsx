"use client";

import { ImagePlus, LoaderCircle, Plus, Upload, X } from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ClipboardEvent } from "react";
import { MAX_REFERENCE_BYTES, MAX_REFERENCE_IMAGES, REFERENCE_MIME_TYPES } from "@/constants/image-generator";
import type { ReferenceImage } from "@/types/image-generator";
import styles from "./ReferenceUploader.module.css";

type ReferenceRole = NonNullable<ReferenceImage["role"]>;
export type ReferenceUploadHandle = {
  addFiles: (files: readonly File[], role?: ReferenceRole) => Promise<void>;
  openFilePicker: (role?: ReferenceRole) => void;
};
type ReferenceUploaderProps = {
  items: readonly ReferenceImage[];
  onAdd: (items: readonly ReferenceImage[]) => void;
  onRemove: (id: string) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  editing?: boolean;
  variant?: "panel" | "compact";
  className?: string;
};

export const ReferenceUploader = forwardRef<ReferenceUploadHandle, ReferenceUploaderProps>(function ReferenceUploader(
  { items, onAdd, onRemove, onError, disabled = false, editing = false, variant = "panel", className = "" },
  ref,
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  const reading = useRef(false);
  const inputRole = useRef<ReferenceRole>("subject");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    onError?.(error);
  }, [error, onError]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function addFiles(files: readonly File[], role: ReferenceRole = "subject") {
    if (disabled || reading.current || !files.length) return;
    setError("");
    const capacity = MAX_REFERENCE_IMAGES - items.length;
    if (capacity <= 0) {
      setError(`You can use up to ${MAX_REFERENCE_IMAGES} references. Remove one to add another.`);
      return;
    }
    reading.current = true;
    setBusy(true);
    const accepted: ReferenceImage[] = [];
    const issues: string[] = files.length > capacity ? [`Only the first ${capacity} images fit in this set.`] : [];
    try {
      for (const file of files.slice(0, capacity)) {
        if (!REFERENCE_MIME_TYPES.some((type) => type === file.type)) {
          issues.push(`${file.name}: choose a JPG, PNG, or WebP image.`);
          continue;
        }
        if (!file.size || file.size > MAX_REFERENCE_BYTES) {
          issues.push(`${file.name}: choose a file smaller than 20 MB.`);
          continue;
        }
        if ([...items, ...accepted].some((item) => item.name === file.name && item.size === file.size)) {
          issues.push(`${file.name} is already in your references.`);
          continue;
        }
        const url = URL.createObjectURL(file);
        try {
          const decoded = new window.Image();
          decoded.src = url;
          await decoded.decode();
          if (!decoded.naturalWidth || !decoded.naturalHeight) throw new Error("Unreadable image");
          if (!mounted.current) {
            URL.revokeObjectURL(url);
            continue;
          }
          accepted.push({
            id: crypto.randomUUID(),
            url,
            name: file.name,
            mimeType: file.type,
            size: file.size,
            source: "upload",
            role,
          });
        } catch {
          URL.revokeObjectURL(url);
          issues.push(`${file.name} couldn’t be opened. Try another image.`);
        }
      }
      if (!mounted.current) {
        accepted.forEach((item) => URL.revokeObjectURL(item.url));
        return;
      }
      if (accepted.length) onAdd(accepted);
      setError(issues.join(" "));
    } finally {
      reading.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  function openFilePicker(role: ReferenceRole = "subject") {
    if (disabled || reading.current || items.length >= MAX_REFERENCE_IMAGES) return;
    inputRole.current = role;
    inputRef.current?.click();
  }
  useImperativeHandle(ref, () => ({ addFiles, openFilePicker }));

  function paste(event: ClipboardEvent) {
    const images = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith("image/"));
    if (images.length) {
      event.preventDefault();
      void addFiles(images);
    }
  }

  return (
    <section
      className={`${styles.references} ${variant === "compact" ? styles.compact : ""} ${className}`}
      data-empty={!items.length && !busy && !error}
      aria-labelledby="reference-title"
      onPaste={paste}
    >
      <div className={styles.heading}>
        <h3 id="reference-title">
          Reference images <span>{editing ? "Required" : "Optional"}</span>
        </h3>
        <small>
          {items.length}/{MAX_REFERENCE_IMAGES}
        </small>
      </div>
      <div
        className={`${styles.dropzone} ${dragging ? styles.dragging : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setDragging(false);
          void addFiles(Array.from(event.dataTransfer.files));
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={REFERENCE_MIME_TYPES.join(",")}
          multiple
          hidden
          disabled={disabled || busy}
          aria-label="Upload reference images"
          onChange={(event) => {
            void addFiles(Array.from(event.target.files ?? []), inputRole.current);
            event.currentTarget.value = "";
          }}
        />
        {items.length ? (
          <div className={styles.thumbnails}>
            {items.map((item, index) => (
              <div className={styles.thumbnail} key={item.id}>
                {/* Blob URLs stay local; native img avoids image-optimizer requests. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt={`Reference ${index + 1}: ${item.name}`} />
                <span className={styles.index}>{index + 1}</span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onRemove(item.id)}
                  aria-label={`Remove reference ${index + 1}: ${item.name}`}
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </div>
            ))}
            {items.length < MAX_REFERENCE_IMAGES && (
              <button
                type="button"
                className={styles.add}
                onClick={() => openFilePicker()}
                disabled={disabled || busy}
                aria-label="Add another reference image"
              >
                {busy ? (
                  <LoaderCircle className={styles.spinner} size={18} aria-hidden="true" />
                ) : (
                  <Plus size={20} aria-hidden="true" />
                )}
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            className={styles.upload}
            onClick={() => openFilePicker()}
            disabled={disabled || busy}
            aria-describedby="reference-hint"
          >
            {busy ? (
              <LoaderCircle className={styles.spinner} size={23} aria-hidden="true" />
            ) : dragging ? (
              <Upload size={23} aria-hidden="true" />
            ) : (
              <ImagePlus size={23} aria-hidden="true" />
            )}
            <span>
              {busy
                ? "Reading your images…"
                : dragging
                  ? "Drop your references here"
                  : editing
                    ? "Add the image you want to edit"
                    : "Drop an image, or click to add"}
              <small>JPG, PNG, WebP · up to 20 MB each</small>
            </span>
          </button>
        )}
      </div>
      <p className={styles.hint} id="reference-hint">
        {busy ? "Checking your images…" : "Files stay in this browser in preview mode."}
      </p>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </section>
  );
});
