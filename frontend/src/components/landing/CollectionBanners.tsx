import { ArrowUpRight } from "lucide-react";
import { LandingMedia } from "./LandingMedia";
import styles from "./LandingSections.module.css";

export function CollectionBanners() {
  return <section id="collections" className={`landing-section ${styles.collections}`} aria-label="Featured creative collections">
    <article className={styles.collection}>
      <LandingMedia asset="product" behavior="ambient" sizes="(max-width: 600px) 100vw, 50vw" />
      <div className={styles.collectionCopy}>
        <p className={styles.collectionEyebrow}>The product drop</p>
        <h2>Small product.<br />Main character<br /><em>energy.</em></h2>
        <a href="#marketing">Explore product templates <ArrowUpRight size={16} aria-hidden="true" /></a>
      </div>
      <span className={styles.collectionIndex} aria-hidden="true">01 / The campaign edit</span>
    </article>
    <article className={`${styles.collection} ${styles.travel}`}>
      <LandingMedia asset="ocean" behavior="ambient" sizes="(max-width: 600px) 100vw, 50vw" />
      <div className={styles.collectionCopy}>
        <p className={styles.collectionEyebrow}>Escape the ordinary</p>
        <h2>A postcard<br />from your<br /><em>imagination.</em></h2>
        <a href="#seedance">Discover your next escape <ArrowUpRight size={16} aria-hidden="true" /></a>
      </div>
      <span className={styles.collectionIndex} aria-hidden="true">02 / Somewhere new</span>
    </article>
  </section>;
}
