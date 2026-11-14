import { Media } from "@/ui/Media";
import { LoaderCircle } from "lucide-react";
import { portraitStyle } from "@/lib/ai-influencer/portrait";
import type { InfluencerVariation } from "@/types/ai-influencer";
import styles from "./main.module.css";

type ResultCanvasProps = {
  selected: InfluencerVariation | null;
  busy: boolean;
  name: string;
  onCancel: () => void;
};

export function ResultCanvas({ selected, busy, name, onCancel }: ResultCanvasProps) {
  return (
    <div className={styles.canvas}>
      {selected && (
        <figure className={styles.hero}>
          <Media
            key={selected.id}
            media={{ kind: "image", src: selected.url, alt: selected.alt }}
            fill
            sizes="(max-width: 900px) 90vw, 520px"
            imageProps={{ preload: true, style: portraitStyle(selected) }}
          />
          <figcaption className={styles.badge}>Sample preview</figcaption>
        </figure>
      )}
      {busy && (
        <div className={styles.busy} role="status">
          <LoaderCircle className={styles.spinner} size={24} aria-hidden="true" />
          <strong>Creating {name}…</strong>
          <button type="button" onClick={onCancel} autoFocus>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
