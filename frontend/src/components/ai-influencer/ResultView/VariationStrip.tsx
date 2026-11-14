import { Media } from "@/ui/Media";
import { Sparkles } from "lucide-react";
import { VARIATION_COUNT } from "@/components/ai-influencer/constants";
import { portraitStyle } from "@/lib/ai-influencer/portrait";
import type { InfluencerVariation } from "@/types/ai-influencer";
import styles from "./main.module.css";

type VariationStripProps = {
  variations: readonly InfluencerVariation[];
  selectedId: string | null;
  /** A job is running: its images are on the way. */
  busy: boolean;
  onSelect: (id: string) => void;
};

/**
 * Every variation as a thumbnail, scrolling sideways when they don't fit.
 * Dashed placeholders stand in before the first one, and while a job makes the next set.
 */
export function VariationStrip({ variations, selectedId, busy, onSelect }: VariationStripProps) {
  if (busy || variations.length === 0)
    return (
      <div className={styles.strip} aria-hidden="true">
        {Array.from({ length: VARIATION_COUNT }, (_, index) => (
          <span key={index} className={styles.slot}>
            <Sparkles size={14} />
          </span>
        ))}
      </div>
    );

  return (
    <div className={styles.strip} role="radiogroup" aria-label="Variations">
      {variations.map((item, index) => (
        <button
          key={item.id}
          type="button"
          role="radio"
          aria-checked={item.id === selectedId}
          aria-label={`Variation ${index + 1}`}
          className={styles.thumb}
          onClick={() => onSelect(item.id)}
        >
          <Media
            media={{ kind: "image", src: item.url, alt: "" }}
            fill
            sizes="64px"
            imageProps={{ unoptimized: true, style: portraitStyle(item) }}
          />
        </button>
      ))}
    </div>
  );
}
