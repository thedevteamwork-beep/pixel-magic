"use client";

import { Media } from "@/ui/Media";
import { ArrowUpRight, ImagePlus, Type } from "lucide-react";
import { landingAssets } from "@/constants/landing-media";
import { imageTemplates } from "@/constants/image-templates";
import type { TemplateItem } from "@/types/landing";
import { welcomeTemplates } from "./constants";
import styles from "./main.module.css";

type ImageWelcomeProps = {
  modelName?: string;
  onExplore?: () => void;
  onSelectTemplate: (template: TemplateItem) => void;
};

/** What each template starts from, so people know before they pick it. */
const STARTS_FROM = {
  photo: { icon: ImagePlus, label: "Uses your photo" },
  product: { icon: ImagePlus, label: "Uses your product photo" },
  prompt: { icon: Type, label: "Just the prompt" },
} as const;

const templates = welcomeTemplates.flatMap(({ id, startsFrom }) =>
  imageTemplates.filter((item) => item.id === id).map((template) => ({ template, start: STARTS_FROM[startsFrom] })),
);

export function ImageWelcome({ onExplore, onSelectTemplate }: ImageWelcomeProps) {
  return (
    <div className={styles.welcome}>
      <div className={styles.heading}>
        <div>
          <h2>What will you create?</h2>
          <p>Start from a GPT Image 2 template, or describe your own idea below.</p>
        </div>
        {onExplore && (
          <button type="button" className={styles.explore} onClick={onExplore}>
            Browse templates <ArrowUpRight size={14} aria-hidden="true" />
          </button>
        )}
      </div>
      <div className={styles.templates} aria-label="GPT Image 2 templates">
        {templates.map(({ template, start: { icon: Icon, label } }) => {
          const asset = landingAssets[template.asset];
          return (
            <button
              type="button"
              className={styles.template}
              key={template.id}
              onClick={() => onSelectTemplate(template)}
              aria-label={`Use the “${template.title}” template. ${label}.`}
            >
              <Media
                media={{ kind: "image", src: asset.image, alt: asset.alt }}
                fill
                sizes="(max-width: 600px) 44vw, (max-width: 1000px) 42vw, 260px"
              />
              <span className={styles.shade} aria-hidden="true" />
              <span className={styles.templateTag}>{template.tag}</span>
              <span className={styles.templateCopy}>
                <strong>{template.title}</strong>
                <small>
                  <Icon size={12} aria-hidden="true" />
                  {label}
                </small>
              </span>
              <ArrowUpRight className={styles.templateArrow} size={17} aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
