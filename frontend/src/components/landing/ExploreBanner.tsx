import { ArrowUpRight, Sparkles } from "lucide-react";
import styles from "./LandingSections.module.css";

export function ExploreBanner() {
  return <section className={`landing-section ${styles.finalBanner}`} aria-labelledby="explore-title">
    <div><p className={styles.finalEyebrow}><Sparkles size={14} aria-hidden="true" /> A little idea. A whole lot of possibility.</p>
      <h2 id="explore-title">Your next “how did you make that?”<br /><em>starts right here.</em></h2>
      <p>Find something that sparks something.</p>
    </div>
    <a href="#templates">Explore the templates <ArrowUpRight size={19} aria-hidden="true" /></a>
  </section>;
}
