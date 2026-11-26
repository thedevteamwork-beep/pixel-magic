import type { InfluencerPerson } from "@/types/landing";
import { LandingMedia } from "../LandingMedia";
import styles from "./main.module.css";

type FacePickerProps = {
  people: readonly InfluencerPerson[];
  activeIndex: number;
  onSelect: (index: number) => void;
};

/** Round face buttons. Pointing at or tapping one shows that character. */
export function FacePicker({ people, activeIndex, onSelect }: FacePickerProps) {
  return (
    <div className={styles.faces} role="group" aria-label="Characters">
      {people.map((person, index) => (
        <button
          type="button"
          key={person.id}
          className={styles.face}
          aria-pressed={index === activeIndex}
          aria-label={`Show ${person.name}`}
          onPointerEnter={(event) => event.pointerType === "mouse" && onSelect(index)}
          onClick={() => onSelect(index)}
        >
          <LandingMedia asset={person.reference} alt="" sizes="60px" />
        </button>
      ))}
    </div>
  );
}
