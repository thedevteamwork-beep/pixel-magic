"use client";

import { ArrowUpRight, Pause, Play, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { landingAssets } from "@/constants/landing-media";
import type { MediaId } from "@/types/landing";
import { LandingMedia } from "./LandingMedia";
import { useLandingMotion } from "./LandingProvider";
import { Modal } from "./Modal";
import styles from "./HeroShowcase.module.css";

const chapters = [
  {
    id: "cinema",
    label: "Cinema",
    asset: "desert",
    title: "Make something",
    emphasis: "worth stopping for.",
    description:
      "Films with a feeling. Images with a point of view. Discover something that makes you want to make something.",
    target: "#templates",
    caption: "A little perspective changes everything.",
  },
  {
    id: "imagery",
    label: "Imagery",
    asset: "flowers",
    title: "Some ideas deserve",
    emphasis: "to be seen.",
    description:
      "Expressive portraits, unexpected objects, and a whole different point of view. Find your next visual obsession.",
    target: "#gpt-image-2",
    caption: "The everyday, seen a little differently.",
  },
  {
    id: "campaigns",
    label: "Campaigns",
    asset: "product",
    title: "Turn a product",
    emphasis: "into a feeling.",
    description:
      "Discover campaign looks with a little more character. Your next creative direction is waiting in the collection.",
    target: "#marketing",
    caption: "Made to make an impression.",
  },
] as const satisfies readonly {
  id: string;
  label: string;
  asset: MediaId;
  title: string;
  emphasis: string;
  description: string;
  target: string;
  caption: string;
}[];

const reelScenes = [
  { asset: "desert", label: "Open roads" },
  { asset: "ocean", label: "Ocean reverie" },
  { asset: "portrait", label: "After hours" },
  { asset: "product", label: "Objects of desire" },
] as const;

type ReelAsset = (typeof reelScenes)[number]["asset"];

export function HeroShowcase() {
  const [chapterIndex, setChapterIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reelOpen, setReelOpen] = useState(false);
  const [reelAsset, setReelAsset] = useState<ReelAsset>("desert");
  const reelRef = useRef<HTMLVideoElement>(null);
  const { motionEnabled } = useLandingMotion();
  const chapter = chapters[chapterIndex];
  const hasVideo = Boolean(landingAssets[chapter.asset].video);

  useEffect(() => {
    if (!motionEnabled) reelRef.current?.pause();
  }, [motionEnabled]);

  function openReel() {
    const matchingScene = reelScenes.find((scene) => scene.asset === chapter.asset);
    setReelAsset(matchingScene?.asset ?? "desert");
    setReelOpen(true);
  }

  return (
    <>
      <section className={styles.hero} aria-labelledby="hero-title" id="showcase">
        <div className={styles.backdrop}>
          <LandingMedia
            key={chapter.asset}
            asset={chapter.asset}
            behavior={paused || reelOpen ? "still" : "ambient"}
            priority
            sizes="(min-width: 1660px) 1580px, 100vw"
          />
        </div>

        <div className={styles.topline}>
          <span className={styles.signature}>
            <Sparkles size={14} aria-hidden="true" />
            Pixel Magic / The original edit
          </span>
          <span className={styles.edition}>Curated · Vol. 01</span>
        </div>

        <div className={styles.copy}>
          <h1 id="hero-title" className={styles.title}>
            {chapter.title}
            <br />
            <em>{chapter.emphasis}</em>
          </h1>
          <p className={styles.description}>{chapter.description}</p>
          <div className={styles.actions}>
            <a className="button-primary" href={chapter.target}>
              Explore the collection
              <ArrowUpRight size={17} aria-hidden="true" />
            </a>
            <button className={styles.reelTrigger} type="button" onClick={openReel}>
              <Play size={15} aria-hidden="true" />
              Watch the reel
            </button>
          </div>
        </div>

        <div className={styles.bottomline}>
          <div className={styles.chapters} role="group" aria-label="Showcase chapters">
            {chapters.map((item, index) => (
              <button
                type="button"
                key={item.id}
                aria-pressed={index === chapterIndex}
                onClick={() => {
                  setChapterIndex(index);
                  setPaused(false);
                }}
              >
                <span className={styles.chapterNumber} aria-hidden="true">
                  0{index + 1}
                </span>
                {item.label}
              </button>
            ))}
          </div>
          <div className={styles.filmControls}>
            <span className={styles.caption}>{chapter.caption}</span>
            {hasVideo && (
              <button
                className={styles.pause}
                type="button"
                aria-label={paused || !motionEnabled ? "Play featured film" : "Pause featured film"}
                aria-pressed={paused}
                disabled={!motionEnabled}
                title={!motionEnabled ? "Motion previews are paused" : undefined}
                onClick={() => setPaused((value) => !value)}
              >
                {paused || !motionEnabled ? (
                  <Play size={15} aria-hidden="true" />
                ) : (
                  <Pause size={15} aria-hidden="true" />
                )}
              </button>
            )}
          </div>
        </div>
      </section>

      <Modal open={reelOpen} onClose={() => setReelOpen(false)} title="Pixel Magic / The showreel">
        {reelOpen && (
          <>
            <video
              key={reelAsset}
              ref={reelRef}
              className={styles.reelPlayer}
              src={landingAssets[reelAsset].video}
              poster={landingAssets[reelAsset].image}
              controls
              autoPlay={motionEnabled}
              muted
              playsInline
              loop
              preload="metadata"
              aria-label={`${reelScenes.find((scene) => scene.asset === reelAsset)?.label} showcase film`}
            />
            <div className={styles.reelScenes} role="group" aria-label="Showreel scenes">
              {reelScenes.map((scene, index) => (
                <button
                  key={scene.asset}
                  type="button"
                  aria-pressed={reelAsset === scene.asset}
                  onClick={() => setReelAsset(scene.asset)}
                >
                  <span aria-hidden="true">0{index + 1}</span>
                  {scene.label}
                </button>
              ))}
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
