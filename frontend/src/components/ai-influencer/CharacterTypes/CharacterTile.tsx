import { Media } from "@/ui/Media";
import { Check } from "lucide-react";
import { landingAssets } from "@/constants/landing-media";
import type { Archetype } from "@/types/ai-influencer";
import styles from "./main.module.css";

type CharacterTileProps = {
  item: Archetype;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
};

export function CharacterTile({ item, selected, disabled, onSelect }: CharacterTileProps) {
  return (
    <button
      type="button"
      className={styles.tile}
      data-tone={item.tone}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onSelect}
    >
      <Media
        media={{ kind: "image", src: landingAssets[item.asset].image, alt: "" }}
        fill
        sizes="110px"
        className={styles.art}
      />
      <span className={styles.shade} aria-hidden="true" />
      <span className={styles.label}>{item.title}</span>
      {selected && (
        <span className={styles.check} aria-hidden="true">
          <Check size={12} />
        </span>
      )}
    </button>
  );
}
