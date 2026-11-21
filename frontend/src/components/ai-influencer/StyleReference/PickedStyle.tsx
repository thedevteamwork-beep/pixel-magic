import { X } from "lucide-react";
import type { StyleReference } from "@/types/ai-influencer";
import { Media } from "@/ui/Media";
import styles from "./main.module.css";

type PickedStyleProps = {
  style: StyleReference;
  disabled: boolean;
  /** Opens the library to pick another style. */
  onChange: () => void;
  onRemove: () => void;
};

export function PickedStyle({ style, disabled, onChange, onRemove }: PickedStyleProps) {
  return (
    <div className={styles.picked}>
      <Media
        media={{ kind: "image", src: style.url, alt: "" }}
        fill
        sizes="60px"
        className={styles.pickedThumb}
        // Signed storage URLs come from hosts next/image isn't configured for, so they load as they are.
        imageProps={{ unoptimized: true }}
      />
      <span className={styles.pickedText}>
        <small>Style reference</small>
        <strong title={style.name}>{style.name}</strong>
      </span>
      <button type="button" className={styles.change} onClick={onChange} disabled={disabled}>
        Change
      </button>
      <button
        type="button"
        className={styles.remove}
        onClick={onRemove}
        disabled={disabled}
        aria-label="Remove style reference"
      >
        <X size={15} />
      </button>
    </div>
  );
}
