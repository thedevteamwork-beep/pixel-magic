"use client";

import { Sparkles } from "lucide-react";
import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { heroChapters, heroCopy, reelScenes } from "@/components/landing/constants";
import { useAutoAdvance } from "@/lib/landing/useAutoAdvance";
import { ActionPill } from "../ActionPill";
import { useLandingMotion, useTemplateFilters } from "../LandingProvider";
import { ChapterTabs } from "./ChapterTabs";
import { HeroBackdrop } from "./HeroBackdrop";
import { ReelDialog } from "./ReelDialog";
import styles from "./main.module.css";

/**
 * The featured banner. Its chapters switch the film behind and the headline every few seconds, pausing while the
 * pointer rests on it. The film drifts a little with the pointer, under a soft glow that follows it.
 */
export function HeroShowcase() {
  const heroRef = useRef<HTMLElement>(null);
  const [reelOpen, setReelOpen] = useState(false);
  const [reelIndex, setReelIndex] = useState(0);
  const { motionEnabled } = useLandingMotion();
  const { setFilters } = useTemplateFilters();
  const chapters = useAutoAdvance(heroChapters.length, heroCopy.chapterMs, motionEnabled && !reelOpen);
  const chapter = heroChapters[chapters.index];

  function follow(event: PointerEvent<HTMLElement>) {
    const hero = heroRef.current;
    if (!hero || event.pointerType !== "mouse") return;
    const bounds = hero.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    hero.style.setProperty("--spot-x", `${x * 100}%`);
    hero.style.setProperty("--spot-y", `${y * 100}%`);
    if (motionEnabled) {
      hero.style.setProperty("--drift-x", `${(0.5 - x) * 18}px`);
      hero.style.setProperty("--drift-y", `${(0.5 - y) * 12}px`);
    }
  }

  function settle() {
    heroRef.current?.style.setProperty("--drift-x", "0px");
    heroRef.current?.style.setProperty("--drift-y", "0px");
    chapters.release();
  }

  function openReel() {
    const match = reelScenes.findIndex((scene) => scene.asset === chapter.backdrop.asset);
    setReelIndex(match === -1 ? 0 : match);
    setReelOpen(true);
  }

  return (
    <>
      <section
        ref={heroRef}
        className={styles.hero}
        id="showcase"
        aria-labelledby="hero-title"
        style={{ "--chapter-ms": `${heroCopy.chapterMs}ms` } as CSSProperties}
        onPointerEnter={(event) => event.pointerType === "mouse" && chapters.hold()}
        onPointerMove={follow}
        onPointerLeave={settle}
      >
        <HeroBackdrop chapters={heroChapters} activeIndex={chapters.index} paused={reelOpen} />
        <span className={styles.spotlight} aria-hidden="true" />

        <div className={styles.inner}>
          <div className={styles.topline}>
            <span className={styles.signature}>
              <Sparkles size={13} aria-hidden="true" />
              {heroCopy.signature}
            </span>
            <span className={styles.edition}>{heroCopy.edition}</span>
          </div>

          {/* Keyed by chapter, so each headline rises in line by line. */}
          <h1 id="hero-title" className={styles.title} key={chapter.id}>
            <span className={styles.line}>
              <span>{chapter.heading.title}</span>
            </span>
            <span className={styles.line}>
              <em>{chapter.heading.accent}</em>
            </span>
          </h1>
          <p className={styles.description}>{chapter.description}</p>

          <div className={styles.actions}>
            <ActionPill href="#templates" onClick={() => setFilters(chapter.filters)}>
              Explore the collection
            </ActionPill>
            <ActionPill variant="glass" onClick={openReel}>
              Watch the reel
            </ActionPill>
          </div>

          <div className={styles.bottom}>
            <ChapterTabs
              chapters={heroChapters}
              activeIndex={chapters.index}
              runKey={chapters.runKey}
              running={chapters.running}
              onSelect={chapters.go}
            />
            <span className={styles.caption}>{heroCopy.caption}</span>
          </div>
        </div>
      </section>

      <ReelDialog
        open={reelOpen}
        sceneIndex={reelIndex}
        autoPlay={motionEnabled}
        onSelect={setReelIndex}
        onClose={() => setReelOpen(false)}
      />
    </>
  );
}
