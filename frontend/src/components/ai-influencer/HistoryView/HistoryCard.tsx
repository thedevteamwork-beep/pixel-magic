import { Media } from "@/ui/Media";
import { Trash2, UserRound } from "lucide-react";
import { traitsFromProject } from "@/lib/ai-influencer/projects";
import { displayName, traitLabel } from "@/lib/ai-influencer/prompt";
import type { ProjectView } from "@/lib/api/types";
import styles from "./main.module.css";

type HistoryCardProps = {
  project: ProjectView;
  disabled: boolean;
  onOpen: () => void;
  onRemove: () => void;
};

export function HistoryCard({ project, disabled, onOpen, onRemove }: HistoryCardProps) {
  const traits = traitsFromProject(project);
  const name = displayName(traits);
  const details = [
    traits.hairStyle && traitLabel("hairStyle", traits.hairStyle),
    traits.outfit && traitLabel("outfit", traits.outfit),
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className={styles.item}>
      <button type="button" className={styles.card} onClick={onOpen} disabled={disabled} aria-label={`Open ${name}`}>
        {project.cover ? (
          <Media
            media={{ kind: "image", src: project.cover.url, alt: "" }}
            fill
            sizes="(max-width: 700px) 45vw, 220px"
            className={styles.image}
            // Signed storage URLs come from hosts next/image isn't configured for, so they load as they are.
            imageProps={{ unoptimized: true }}
          />
        ) : (
          // No completed generation yet, so there is no cover.
          <span className={styles.placeholder} aria-hidden="true">
            <UserRound size={32} strokeWidth={1.25} />
          </span>
        )}
        <span className={styles.shade} aria-hidden="true" />
        <span className={styles.meta}>
          <strong>{name}</strong>
          <small>{details}</small>
        </span>
      </button>
      <button
        type="button"
        className={styles.remove}
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Remove ${name}`}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
