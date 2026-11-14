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
            // Signed storage URLs come from hosts next/image isn't configured for, so they load as they are.
            imageProps={{ preload: true, unoptimized: true, style: portraitStyle(selected) }}
          />
        </figure>
      )}
      {!selected && !busy && (
        <p className={styles.emptyNote}>No portraits yet. Press Generate to make the first ones.</p>
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
