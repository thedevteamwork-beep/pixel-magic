import type { AccentTitle } from "@/types/landing";
import styles from "./main.module.css";

type AccentHeadingProps = {
  heading: AccentTitle;
  as?: "h1" | "h2" | "h3";
  id?: string;
  /** Size and spacing come from the caller. */
  className?: string;
  /** Keep both parts on one line instead of breaking before the accent. */
  inline?: boolean;
};

/** A heading whose last words are set in the italic serif, in the brand colour. */
export function AccentHeading({ heading, as: Tag = "h2", id, className = "", inline = false }: AccentHeadingProps) {
  return (
    <Tag id={id} className={`${styles.heading} ${className}`}>
      {heading.title}
      {inline ? " " : <br />}
      <em className={styles.accent}>{heading.accent}</em>
    </Tag>
  );
}
