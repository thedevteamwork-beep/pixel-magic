"use client";

import { ImagePlus } from "lucide-react";
import { useState, type DragEvent } from "react";
import styles from "./main.module.css";

type UploadDropzoneProps = {
  disabled: boolean;
  /** A short line under the title, such as when the current model doesn't take a photo. */
  note?: string;
  /** Called when the box is clicked, so the parent can open its file picker. */
  onBrowse: () => void;
  onFiles: (files: FileList | null) => void;
};

export function UploadDropzone({ disabled, note, onBrowse, onFiles }: UploadDropzoneProps) {
  const [dragging, setDragging] = useState(false);

  function drop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    if (!disabled) onFiles(event.dataTransfer.files);
  }

  return (
    <button
      type="button"
      className={styles.drop}
      data-dragging={dragging}
      disabled={disabled}
      onClick={onBrowse}
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
      <span className={styles.label}>
        <strong>Upload your photo</strong>
        {note && <small className={styles.note}>{note}</small>}
      </span>
    </button>
  );
}
