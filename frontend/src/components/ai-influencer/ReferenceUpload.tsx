"use client";

import { ImagePlus, X } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { REFERENCE_MIME_TYPES } from "@/constants/image-generator";
import { useInfluencer } from "./InfluencerContext";
import styles from "./ReferenceUpload.module.css";

/** Optional face photo. It stays in the browser and only changes the preview prompt. */
export function ReferenceUpload() {
  const { state, attachReference, removeReference } = useInfluencer();
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const busy = state.status === "generating";

  function pick(files: FileList | null) {
    const file = files?.[0];
    if (file) setError(attachReference(file) ?? "");
  }

  function drop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    if (!busy) pick(event.dataTransfer.files);
  }

  return (
    <div>
      <input
        ref={input}
        className={styles.file}
        type="file"
        accept={REFERENCE_MIME_TYPES.join(",")}
        tabIndex={-1}
        aria-label="Upload your photo"
        onChange={(event) => {
          pick(event.currentTarget.files);
          event.currentTarget.value = "";
        }}
      />
      {state.reference ? (
        <div className={styles.attached}>
          {/* Browser-local object URL; never sent to the image optimizer. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={state.reference.url} alt="" />
          <span className={styles.name} title={state.reference.name}>
            {state.reference.name}
          </span>
          <button type="button" onClick={removeReference} disabled={busy} aria-label="Remove photo">
            <X size={15} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={styles.drop}
          data-dragging={dragging}
          disabled={busy}
          onClick={() => input.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={drop}
        >
          <span className={styles.optional}>Optional</span>
          <span className={styles.icon} aria-hidden="true">
            <ImagePlus size={18} />
          </span>
          <strong>Upload your photo</strong>
        </button>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
