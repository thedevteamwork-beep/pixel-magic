import { X } from "lucide-react";
import type { ReferencePhoto } from "@/types/ai-influencer";
import styles from "./main.module.css";

type AttachedPhotoProps = {
  photo: ReferencePhoto;
  disabled: boolean;
  onRemove: () => void;
};

export function AttachedPhoto({ photo, disabled, onRemove }: AttachedPhotoProps) {
  return (
    <div className={styles.attached}>
      {/* Browser-local object URL; never sent to the image optimizer. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.url} alt="" />
      <span className={styles.name} title={photo.name}>
        {photo.name}
      </span>
      <button type="button" onClick={onRemove} disabled={disabled} aria-label="Remove photo">
        <X size={15} />
      </button>
    </div>
  );
}
