"use client";

import { useEffect, useRef, useState } from "react";
import { adFormats, marketingSection, marketingStudioLink } from "@/components/landing/constants";
import { AccentHeading } from "../AccentHeading";
import { ActionPill } from "../ActionPill";
import { useTemplateFilters } from "../LandingProvider";
import { FormatFan } from "./FormatFan";
import styles from "./main.module.css";

/** Marketing Studio: what it makes, and a product photo that spreads into every ad size on hover. */
export function MarketingShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const { setFilters } = useTemplateFilters();

  // Touch screens have no hover, so the stack spreads once it scrolls into view.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || window.matchMedia("(hover: hover)").matches) return;
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && setOpen(true), { threshold: 0.5 });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`landing-section ${styles.section}`}
      id="marketing"
      aria-labelledby="marketing-heading"
      onPointerEnter={(event) => event.pointerType === "mouse" && setOpen(true)}
      onPointerLeave={(event) => event.pointerType === "mouse" && setOpen(false)}
    >
      <div className={styles.copy}>
        <p className="section-eyebrow">{marketingSection.eyebrow}</p>
        <AccentHeading heading={marketingSection.heading} id="marketing-heading" className={styles.title} />
        <p className={styles.description}>{marketingSection.description}</p>
        <ul className={styles.points}>
          {marketingSection.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
        <ActionPill
          href={marketingStudioLink.href}
          onClick={() => marketingStudioLink.filters && setFilters(marketingStudioLink.filters)}
        >
          {marketingSection.cta}
        </ActionPill>
      </div>
      <div className={styles.visual}>
        <FormatFan formats={adFormats} open={open} />
        <span className={styles.hint} data-hidden={open}>
          {marketingSection.hint}
        </span>
      </div>
    </section>
  );
}
