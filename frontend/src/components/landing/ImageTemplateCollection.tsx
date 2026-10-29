"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { imageTemplates } from "@/constants/landing-templates";
import { useLandingMotion } from "./LandingProvider";
import { TemplateGrid } from "./TemplateGrid";
import styles from "./ImageTemplateCollection.module.css";

export function ImageTemplateCollection() {
  const viewportId = useId();
  const viewportRef = useRef<HTMLDivElement>(null);
  const { motionEnabled } = useLandingMotion();
  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateEdges = () => {
      const start = viewport.scrollLeft <= 2;
      const end = viewport.scrollLeft + viewport.clientWidth >= viewport.scrollWidth - 2;
      setEdges((previous) => previous.start === start && previous.end === end ? previous : { start, end });
    };

    viewport.addEventListener("scroll", updateEdges, { passive: true });
    const observer = new ResizeObserver(updateEdges);
    observer.observe(viewport);
    updateEdges();

    return () => {
      viewport.removeEventListener("scroll", updateEdges);
      observer.disconnect();
    };
  }, []);

  function scroll(direction: number) {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollBy({ left: direction * viewport.clientWidth * .75, behavior: motionEnabled ? "smooth" : "auto" });
  }

  return (
    <section className={`landing-section ${styles.section}`} id="gpt-image-2" aria-labelledby="image-templates-heading">
      <div className={styles.heading}>
        <div>
          <p className="section-eyebrow">The image collection</p>
          <div className={styles.titleRow}>
            <h2 className="section-title" id="image-templates-heading">GPT Image 2</h2>
            <span className={styles.badge}>Image collection</span>
          </div>
          <p className="section-description">Your next cover, campaign, or completely unexpected idea.</p>
        </div>
        <div className={styles.navigation} role="group" aria-label="Image collection navigation">
          <button type="button" onClick={() => scroll(-1)} disabled={edges.start} aria-label="Previous image templates" aria-controls={viewportId}><ArrowLeft size={18} /></button>
          <button type="button" onClick={() => scroll(1)} disabled={edges.end} aria-label="Next image templates" aria-controls={viewportId}><ArrowRight size={18} /></button>
        </div>
      </div>
      <TemplateGrid items={imageTemplates} label="Scrolling GPT Image 2 template collection" horizontal viewportRef={viewportRef} viewportId={viewportId} />
      <p className={styles.note}>Swipe, scroll, or follow your curiosity. Every look is a starting point.</p>
    </section>
  );
}
