import type { AccentTitle } from "@/types/landing";
import { AccentHeading } from "../AccentHeading";
import styles from "./main.module.css";

type SectionIntroProps = {
  eyebrow: string;
  heading: AccentTitle;
  description?: string;
  /** The heading's id, for the section's `aria-labelledby`. */
  headingId: string;
  className?: string;
};

/** The small label, heading and line of text that open a home page section. */
export function SectionIntro({ eyebrow, heading, description, headingId, className = "" }: SectionIntroProps) {
  return (
    <div className={`${styles.intro} ${className}`}>
      <p className="section-eyebrow">{eyebrow}</p>
      <AccentHeading heading={heading} id={headingId} className={styles.title} inline />
      {description && <p className={styles.description}>{description}</p>}
    </div>
  );
}
