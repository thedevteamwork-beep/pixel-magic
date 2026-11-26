import { finalSection, mosaicAssets } from "@/components/landing/constants";
import { AccentHeading } from "../AccentHeading";
import { ActionPill } from "../ActionPill";
import { Mosaic } from "./Mosaic";
import styles from "./main.module.css";

/** The closing banner: one last invitation, over a slowly drifting wall of results. */
export function ExploreBanner() {
  return (
    <section className={`landing-section ${styles.banner}`} aria-labelledby="explore-title">
      <Mosaic assets={mosaicAssets} />
      <div className={styles.content}>
        <p className="section-eyebrow">{finalSection.eyebrow}</p>
        <AccentHeading heading={finalSection.heading} id="explore-title" className={styles.title} />
        <p className={styles.description}>{finalSection.description}</p>
        <ActionPill href={finalSection.cta.href}>{finalSection.cta.label}</ActionPill>
      </div>
    </section>
  );
}
