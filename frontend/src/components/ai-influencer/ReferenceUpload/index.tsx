"use client";

import { useRef, useState } from "react";
import { REFERENCE_MIME_TYPES } from "@/constants/image-generator";
import { useInfluencer } from "../InfluencerContext";
import { AttachedPhoto } from "./AttachedPhoto";
import { UploadDropzone } from "./UploadDropzone";
import styles from "./main.module.css";

/** Optional face photo. It stays in the browser and only changes the preview prompt. */
export function ReferenceUpload() {
  const { state, attachReference, removeReference } = useInfluencer();
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const busy = state.status === "generating";

  function pick(files: FileList | null) {
    const file = files?.[0];
    if (file) setError(attachReference(file) ?? "");
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
        <AttachedPhoto photo={state.reference} disabled={busy} onRemove={removeReference} />
      ) : (
        <UploadDropzone disabled={busy} onBrowse={() => input.current?.click()} onFiles={pick} />
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
