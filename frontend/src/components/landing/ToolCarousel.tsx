"use client";

import { ArrowUpRight, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { creativeTools, type CreativeTool } from "@/constants/landing-tools";
import { LandingMedia } from "./LandingMedia";
import { useLandingMotion, useTemplateFilters } from "./LandingProvider";
import styles from "./ToolCarousel.module.css";

function ToolCard({ tool, index }: { tool: CreativeTool; index: number }) {
  const [active, setActive] = useState(false);
  const { setFilters } = useTemplateFilters();

  return (
    <a
      href={tool.href}
      className={styles.card}
      onClick={() => { if (tool.filters) setFilters(tool.filters); }}
      onPointerEnter={() => setActive(true)}
      onPointerLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
    >
      <span
        className={`${styles.artwork} ${styles[tool.tone]} ${styles[tool.artwork]}`}
        aria-hidden="true"
      >
        {tool.artwork === "motion" ? (
          <LandingMedia
            asset={tool.assets[0]}
            alt=""
            behavior="hover"
            active={active}
            priority={index === 1}
            sizes="(max-width: 540px) 88vw, (max-width: 760px) 68vw, (max-width: 1100px) 43vw, 35vw"
            className={styles.motionMedia}
          />
        ) : (
          <span className={styles.frames}>
            {tool.assets.map((asset, assetIndex) => (
              <span className={styles.frame} key={`${asset}-${assetIndex}`}>
                <LandingMedia
                  asset={asset}
                  alt=""
                  behavior="still"
                  priority={index === 0 && assetIndex === 0}
                  sizes="(max-width: 540px) 28vw, 12vw"
                  filter={tool.artwork === "character" && assetIndex === 0 ? "grayscale(1)" : undefined}
                />
              </span>
            ))}
          </span>
        )}
        <span className={styles.label}>{tool.label}</span>
        {tool.artwork === "motion" && (
          <span className={styles.play}><Play size={12} fill="currentColor" /></span>
        )}
        <span className={styles.headline}>{tool.headline[0]}<br />{tool.headline[1]}</span>
        {tool.artwork === "product" && (
          <span className={styles.sticker}>Your next big drop</span>
        )}
      </span>
      <span className={styles.caption}>
        <span><strong>{tool.name}</strong><span className={styles.description}>{tool.description}</span></span>
        <ArrowUpRight size={17} aria-hidden="true" />
      </span>
    </a>
  );
}

export function ToolCarousel() {
  const railRef = useRef<HTMLUListElement>(null);
  const offsetsRef = useRef([0]);
  const [pageCount, setPageCount] = useState(1);
  const [activePage, setActivePage] = useState(0);
  const [scrollEdges, setScrollEdges] = useState({ start: true, end: true });
  const { motionEnabled } = useLandingMotion();

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    let frame = 0;

    const updateActivePage = () => {
      const nearest = offsetsRef.current.reduce((best, offset, index, offsets) => (
        Math.abs(offset - rail.scrollLeft) < Math.abs(offsets[best] - rail.scrollLeft) ? index : best
      ), 0);
      setActivePage(nearest);
      const start = rail.scrollLeft < 2;
      const end = rail.scrollLeft >= rail.scrollWidth - rail.clientWidth - 2;
      setScrollEdges((current) => current.start === start && current.end === end ? current : { start, end });
    };

    const measure = () => {
      const firstSlide = rail.firstElementChild as HTMLElement | null;
      if (!firstSlide) return;
      const maximum = Math.max(0, rail.scrollWidth - rail.clientWidth);
      const gap = parseFloat(getComputedStyle(rail).columnGap) || 0;
      const stride = firstSlide.offsetWidth + gap;
      const cardsPerPage = Math.max(1, Math.floor((rail.clientWidth + gap) / stride));
      const step = stride * cardsPerPage;
      const offsets = [0];
      for (let offset = step; offset < maximum - 2; offset += step) offsets.push(offset);
      if (maximum > 2) {
        // Keep a short final scroll from becoming a nearly duplicate page.
        if (offsets.length > 1 && maximum - offsets[offsets.length - 1] < stride / 2) {
          offsets[offsets.length - 1] = maximum;
        } else {
          offsets.push(maximum);
        }
      }
      offsetsRef.current = offsets;
      setPageCount(offsets.length);
      updateActivePage();
    };

    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateActivePage);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(rail);
    rail.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      rail.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  const goToPage = (page: number) => {
    const targetPage = Math.max(0, Math.min(page, offsetsRef.current.length - 1));
    railRef.current?.scrollTo({ left: offsetsRef.current[targetPage], behavior: motionEnabled ? "smooth" : "instant" });
  };

  return (
    <section className={styles.carousel} aria-label="Explore creative tools" aria-roledescription="carousel">
      <div className={styles.window}>
        <ul
          className={styles.rail}
          ref={railRef}
          aria-label="Creative tools"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) return;
            const nextPage = event.key === "ArrowRight" ? activePage + 1 : event.key === "ArrowLeft" ? activePage - 1 : event.key === "Home" ? 0 : event.key === "End" ? pageCount - 1 : null;
            if (nextPage !== null) { event.preventDefault(); goToPage(nextPage); }
          }}
        >
          {creativeTools.map((tool, index) => <li className={styles.slide} key={tool.id}><ToolCard tool={tool} index={index} /></li>)}
        </ul>
        <button className={`${styles.arrow} ${styles.previous}`} type="button" onClick={() => goToPage(activePage - 1)} disabled={scrollEdges.start} aria-label="Previous tools"><ChevronLeft size={21} /></button>
        <button className={`${styles.arrow} ${styles.next}`} type="button" onClick={() => goToPage(activePage + 1)} disabled={scrollEdges.end} aria-label="Next tools"><ChevronRight size={21} /></button>
      </div>
      <div className={styles.bottom}>
        <p>Find your creative starting point. Make it your own.</p>
        <div className={styles.pages} role="group" aria-label="Tool carousel pages">
          {Array.from({ length: pageCount }, (_, index) => <button type="button" key={index} onClick={() => goToPage(index)} aria-label={`Show tools page ${index + 1}`} aria-current={activePage === index ? "true" : undefined} />)}
        </div>
      </div>
    </section>
  );
}
