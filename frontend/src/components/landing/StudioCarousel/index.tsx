"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { studioCards } from "@/components/landing/constants";
import type { StudioCard as StudioCardData } from "@/types/landing";
import { useLandingMotion, useTemplateFilters } from "../LandingProvider";
import { StudioCard } from "./StudioCard";
import { useRailDrag } from "./useRailDrag";
import styles from "./main.module.css";

/** The studios as a row of wide cards. Scroll, swipe, drag or use the arrows to see the rest. */
export function StudioCarousel() {
  const railRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const { motionEnabled } = useLandingMotion();
  const { setFilters } = useTemplateFilters();
  const { dragging, onClickCapture } = useRailDrag(railRef);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const measure = () => {
      const start = rail.scrollLeft <= 4;
      const end = rail.scrollLeft >= rail.scrollWidth - rail.clientWidth - 4;
      setEdges((current) => (current.start === start && current.end === end ? current : { start, end }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(rail);
    rail.addEventListener("scroll", measure, { passive: true });
    return () => {
      observer.disconnect();
      rail.removeEventListener("scroll", measure);
    };
  }, []);

  function scrollByCard(direction: 1 | -1) {
    const rail = railRef.current;
    const card = rail?.firstElementChild as HTMLElement | null;
    if (!rail || !card) return;
    const gap = parseFloat(getComputedStyle(rail).columnGap) || 0;
    rail.scrollBy({ left: direction * (card.offsetWidth + gap), behavior: motionEnabled ? "smooth" : "instant" });
  }

  function open(card: StudioCardData) {
    if (card.filters) setFilters(card.filters);
  }

  return (
    <section className={styles.carousel} aria-label="Studios">
      <ul
        ref={railRef}
        className={styles.rail}
        data-dragging={dragging}
        tabIndex={0}
        aria-label="Studios"
        onClickCapture={onClickCapture}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            event.preventDefault();
            scrollByCard(event.key === "ArrowRight" ? 1 : -1);
          }
        }}
      >
        {studioCards.map((card, index) => (
          <li className={styles.slide} key={card.id}>
            <StudioCard card={card} priority={index < 2} onOpen={open} />
          </li>
        ))}
      </ul>
      <button
        type="button"
        className={`${styles.arrow} ${styles.previous}`}
        onClick={() => scrollByCard(-1)}
        data-hidden={edges.start}
        tabIndex={edges.start ? -1 : 0}
        aria-label="Previous studios"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        type="button"
        className={`${styles.arrow} ${styles.next}`}
        onClick={() => scrollByCard(1)}
        data-hidden={edges.end}
        tabIndex={edges.end ? -1 : 0}
        aria-label="More studios"
      >
        <ChevronRight size={20} />
      </button>
    </section>
  );
}
