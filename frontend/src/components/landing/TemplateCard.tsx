"use client";

import { ArrowUpRight, Play, Sparkles } from "lucide-react";
import { useState } from "react";
import type { TemplateItem } from "@/types/landing";
import { LandingMedia } from "./LandingMedia";
import styles from "./TemplateCard.module.css";

type TemplateCardProps = {
  item: TemplateItem;
  onPreview: (item: TemplateItem) => void;
};

export function TemplateCard({ item, onPreview }: TemplateCardProps) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const video = item.mediaType === "video";

  return (
    <button
      type="button"
      className={styles.card}
      onClick={() => onPreview(item)}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      aria-label={`Preview ${item.title}, ${item.model} ${item.mediaType} template`}
      aria-haspopup="dialog"
      data-template-id={item.id}
    >
      <LandingMedia
        asset={item.asset}
        alt={`${item.title}: ${item.description}`}
        behavior={video ? "hover" : "still"}
        active={hovered || focused}
        filter={item.filter}
        className={styles.media}
        sizes="(max-width: 600px) 55vw, (max-width: 1100px) 34vw, 25vw"
      />
      <span className={styles.shade} aria-hidden="true" />
      <span className={styles.meta} aria-hidden="true">
        <span className={styles.pill}>{item.model}</span>
        <span className={styles.pill}>
          {video ? <Play size={11} /> : <Sparkles size={11} />}
          {item.tag}
        </span>
      </span>
      <span className={styles.copy} aria-hidden="true">
        <span className={styles.title}>{item.title}</span>
        <span className={styles.description}>{item.description}</span>
      </span>
      <span className={styles.previewIcon} aria-hidden="true"><ArrowUpRight size={16} /></span>
    </button>
  );
}
