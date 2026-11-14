import { Media } from "@/ui/Media";
import { Sparkles } from "lucide-react";
import { VARIATION_COUNT } from "@/components/ai-influencer/constants";
import { portraitStyle } from "@/lib/ai-influencer/portrait";
import type { InfluencerVariation } from "@/types/ai-influencer";
import styles from "./main.module.css";

type VariationStripProps = {
  variations: readonly InfluencerVariation[];
  selectedId: string | null;
  disabled: boolean;
  onSelect: (id: string) => void;
};

/** One thumbnail per variation, with dashed placeholders for the ones not made yet. */
export function VariationStrip({ variations, selectedId, disabled, onSelect }: VariationStripProps) {
  return (
    <div className={styles.strip} role="radiogroup" aria-label="Variations">
      {Array.from({ length: VARIATION_COUNT }, (_, index) => {
        const item = variations[index];
        return item ? (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={item.id === selectedId}
            aria-label={`Variation ${index + 1}`}
            className={styles.thumb}
            disabled={disabled}
            onClick={() => onSelect(item.id)}
          >
            <Media
              media={{ kind: "image", src: item.url, alt: "" }}
              fill
              sizes="64px"
              imageProps={{ style: portraitStyle(item) }}
            />
          </button>
        ) : (
          <span key={index} className={styles.slot} aria-hidden="true">
            <Sparkles size={14} />
          </span>
        );
      })}
    </div>
  );
}
