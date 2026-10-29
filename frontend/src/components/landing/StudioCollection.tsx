import { ArrowUpRight } from "lucide-react";
import { marketingTemplates, seedanceTemplates } from "@/constants/landing-templates";
import type { MediaId } from "@/types/landing";
import { LandingMedia } from "./LandingMedia";
import { TemplateGrid } from "./TemplateGrid";
import styles from "./StudioCollection.module.css";

type CollectionBannerProps = {
  asset: MediaId;
  eyebrow: string;
  title: string;
  description: string;
  target: string;
  headingId: string;
  action: string;
  marketing?: boolean;
};

function CollectionBanner({ asset, eyebrow, title, description, target, headingId, action, marketing = false }: CollectionBannerProps) {
  return (
    <div className={`${styles.banner} ${marketing ? styles.marketing : ""}`}>
      <LandingMedia asset={asset} alt={`${title} collection preview`} behavior="ambient" className={styles.media} sizes="(max-width: 600px) 100vw, 65vw" />
      <div className={styles.shade} aria-hidden="true" />
      <div className={styles.content}>
        <p className="section-eyebrow">{eyebrow}</p>
        <h2 id={headingId}>{title}</h2>
        <p className={styles.description}>{description}</p>
        <a href={target}>{action} <ArrowUpRight size={16} /></a>
      </div>
      <span className={styles.volume} aria-hidden="true">THE PIXEL MAGIC COLLECTION</span>
    </div>
  );
}

export function MarketingCollection() {
  return (
    <section className={`landing-section ${styles.section}`} id="marketing" aria-labelledby="marketing-heading">
      <CollectionBanner
        marketing
        asset="product"
        eyebrow="From product to possibility"
        title="Marketing Studio"
        description="Your product. Their next obsession. Discover a campaign look with a little more personality."
        target="#marketing-templates"
        headingId="marketing-heading"
        action="Explore the campaign edit"
      />
      <div className={styles.subheading} id="marketing-templates">
        <h3>Ideas made to stop the scroll.</h3>
        <p>Product ads · Brand stories · Social</p>
      </div>
      <TemplateGrid items={marketingTemplates} label="Marketing campaign template previews" />
    </section>
  );
}

export function SeedanceCollection() {
  return (
    <section className={`landing-section ${styles.section}`} id="seedance" aria-labelledby="seedance-heading">
      <CollectionBanner
        asset="ocean"
        eyebrow="A model. A whole new point of view."
        title="Seedance 2.5"
        description="Give a moment a story. Explore scenes, portraits, and cinematic little escapes."
        target="#seedance-templates"
        headingId="seedance-heading"
        action="Explore the motion edit"
      />
      <div className={styles.subheading} id="seedance-templates">
        <h3>Made to move you.</h3>
        <p>Your next story starts here.</p>
      </div>
      <TemplateGrid items={seedanceTemplates} label="Seedance 2.5 video template previews" />
    </section>
  );
}
