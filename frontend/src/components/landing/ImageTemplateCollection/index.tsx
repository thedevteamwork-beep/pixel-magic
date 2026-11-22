"use client";

import { imageTemplates } from "@/components/landing/constants";
import { TemplateGrid } from "../TemplateGrid";
import styles from "./main.module.css";

export function ImageTemplateCollection() {
  return (
    <section className={`landing-section ${styles.section}`} id="gpt-image-2" aria-labelledby="image-templates-heading">
      <div className={styles.heading}>
        <div>
          <p className="section-eyebrow">The image collection</p>
          <div className={styles.titleRow}>
            <h2 className="section-title" id="image-templates-heading">
              GPT Image 2
            </h2>
            <span className={styles.badge}>Image collection</span>
          </div>
          <p className="section-description">Your next cover, campaign, or completely unexpected idea.</p>
        </div>
      </div>
      <TemplateGrid
        items={imageTemplates}
        label="GPT Image 2 templates"
        showTitles
      />
      <p className={styles.note}>Choose a starting point, then make it your own.</p>
    </section>
  );
}
