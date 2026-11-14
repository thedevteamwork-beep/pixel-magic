import { useId } from "react";
import type { InfluencerTraits, TileKind, TraitOption } from "@/types/ai-influencer";
import { ArtTile } from "../ArtTile";
import styles from "./main.module.css";

type OptionTilesProps = {
  kind: TileKind;
  options: readonly TraitOption[];
  value: string;
  traits: InfluencerTraits;
  /** Clicking the selected tile again clears it (for optional traits). */
  allowClear?: boolean;
  onChange: (value: string) => void;
};

/** Picture tiles showing what each option means. */
export function OptionTiles({ kind, options, value, traits, allowClear, onChange }: OptionTilesProps) {
  const name = useId();
  return (
    <div className={styles.tiles}>
      {options.map((option) => (
        <label key={option.value} className={styles.tile} data-kind={kind} data-selected={option.value === value}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={option.value === value}
            onChange={() => onChange(option.value)}
            onClick={() => {
              if (allowClear && option.value === value) onChange("");
            }}
          />
          <span className={styles.art}>
            <ArtTile kind={kind} option={option} traits={traits} />
          </span>
          <span className={styles.tileLabel}>{option.label}</span>
        </label>
      ))}
    </div>
  );
}
