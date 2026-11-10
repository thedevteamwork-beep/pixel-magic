"use client";

import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { imageInspirations } from "@/constants/image-generator";
import { imageTemplateArtwork } from "@/constants/image-template-artwork";
import { landingAssets } from "@/constants/landing-media";
import styles from "./ImageWelcome.module.css";

type ImageWelcomeProps = {
  modelName?: string;
  onExplore?: () => void;
  onSelectInspiration: (id: string) => void;
};

const welcomeTemplates = [
  { id: "object-study", category: "Product" },
  { id: "character-study", category: "Portrait" },
  { id: "desert-study", category: "Cinematic" },
  { id: "architecture-study", category: "Architecture" },
] as const;

export function ImageWelcome({ onExplore, onSelectInspiration }: ImageWelcomeProps) {
  return (
    <div className={styles.welcome}>
      <div className={styles.heading}>
        <h2>What will you create?</h2>
        {onExplore && <button type="button" className={styles.explore} onClick={onExplore}>Browse templates <ArrowUpRight size={14} aria-hidden="true" /></button>}
      </div>
      <div className={styles.templates} aria-label="Sample prompt inspiration">
        {welcomeTemplates.map(({ id, category }) => {
          const item = imageInspirations.find((inspiration) => inspiration.id === id);
          if (!item) return null;
          const asset = imageTemplateArtwork[item.id] ?? landingAssets[item.asset];
          return <button type="button" className={styles.template} key={id} onClick={() => onSelectInspiration(id)} aria-label={`Use ${category.toLowerCase()} sample inspiration: ${item.title}`}>
            <Image src={asset.image} alt={asset.alt} fill sizes="(max-width: 600px) 44vw, (max-width: 1000px) 42vw, 260px" />
            <span className={styles.shade} aria-hidden="true" />
            <span className={styles.category}>{category}</span>
            <ArrowUpRight className={styles.templateArrow} size={17} aria-hidden="true" />
          </button>;
        })}
      </div>
    </div>
  );
}
