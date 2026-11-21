import { X } from "lucide-react";
import type { ReferencePhoto } from "@/types/ai-influencer";
import styles from "./main.module.css";

type AttachedPhotoProps = {
  photo: ReferencePhoto;
  /** A short line under the file name, such as when the current model doesn't take a photo. */
  note?: string;
  disabled: boolean;
  onRemove: () => void;
};

export function AttachedPhoto({ photo, note, disabled, onRemove }: AttachedPhotoProps) {
  return (
    <div className={styles.attached}>
      {/* Browser-local object URL; never sent to the image optimizer. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.url} alt="" />
      <span className={styles.label}>
        <span className={styles.name} title={photo.name}>
          {photo.name}
        </span>
        {note && <small className={styles.note}>{note}</small>}
      </span>
      <button type="button" onClick={onRemove} disabled={disabled} aria-label="Remove photo">
        <X size={15} />
      </button>
    </div>
  );
}
