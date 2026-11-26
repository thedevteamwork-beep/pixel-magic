import Link from "next/link";
import type { ModelChip as ModelChipData } from "@/types/landing";
import styles from "./main.module.css";

type ModelChipProps = {
  model: ModelChipData;
  /** The repeated copy that makes the loop seamless; hidden from screen readers and the tab order. */
  copy?: boolean;
};

/** One model as a pill: its badge, name and what it is good at. Opens its studio with the model picked. */
export function ModelChip({ model, copy = false }: ModelChipProps) {
  return (
    <Link href={model.href} className={styles.chip} aria-hidden={copy || undefined} tabIndex={copy ? -1 : undefined}>
      <span className={styles.mark} aria-hidden="true">
        {model.mark}
      </span>
      <span>
        <b>
          {model.name}
          {model.isNew && <span className={styles.new}>New</span>}
        </b>
        <small>{model.description}</small>
      </span>
    </Link>
  );
}
