"use client";

import { Check, ImagePlus, Play, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { landingAssets } from "@/constants/landing-media";
import { Media } from "@/ui/Media";
import styles from "./main.module.css";

/** Step 1: a photo drops onto the upload box, with a prompt under it. */
function IdeaArt() {
  return (
    <div className={styles.art} aria-hidden="true">
      <div className={styles.dropzone}>
        <ImagePlus size={22} />
        <span>Add a photo, clip or references</span>
      </div>
      <div className={styles.photo}>
        <Media media={{ kind: "image", src: landingAssets.portrait.image, alt: "" }} fill plain sizes="160px" />
      </div>
      <div className={styles.promptLine}>
        A slow push-in as she turns to the camera
        <span className={styles.caret} />
      </div>
    </div>
  );
}

/** Step 2: the shot's settings, as the panel shows them. */
function SetupArt() {
  return (
    <div className={styles.art} aria-hidden="true">
      <div className={styles.settings}>
        <div className={styles.modelRow}>
          <span className={styles.glyph}>❋</span>
          <span>
            <small>Model</small>
            <strong>Seedance 2.5</strong>
          </span>
          <Check size={15} className={styles.check} />
        </div>
        <div className={styles.chipRow}>
          <span data-on="true">5s</span>
          <span>10s</span>
          <span>15s</span>
        </div>
        <div className={styles.chipRow}>
          <span>16:9</span>
          <span data-on="true">9:16</span>
          <span>1:1</span>
          <span>Sound</span>
        </div>
        <div className={styles.price}>
          Generate <span>✦ 150</span>
        </div>
      </div>
    </div>
  );
}

/** Step 3: a take playing, with the other takes beside it and the best one kept. */
function TakesArt({ autoplay }: { autoplay: boolean }) {
  const { desert, ocean, product } = landingAssets;
  return (
    <div className={styles.art} aria-hidden="true">
      <div className={styles.player}>
        <Media media={{ kind: "image", src: desert.image, alt: "" }} fill plain sizes="320px" />
        {autoplay && desert.video && (
          <video src={desert.video} poster={desert.image} autoPlay muted loop playsInline className={styles.clip} />
        )}
        <span className={styles.playBadge}>
          <Play size={11} fill="currentColor" /> 0:05
        </span>
      </div>
      <div className={styles.takes}>
        {[desert, ocean, product].map((asset, index) => (
          <span key={asset.image} className={styles.take} data-best={index === 0}>
            <Media media={{ kind: "image", src: asset.image, alt: "" }} fill plain sizes="80px" />
            {index === 0 && (
              <span className={styles.best}>
                <Check size={10} strokeWidth={3} /> Best
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

function Step({ number, title, text, art }: { number: number; title: string; text: string; art: ReactNode }) {
  return (
    <li className={styles.step}>
      {art}
      <h3>
        <span className={styles.number}>{number}</span>
        {title}
      </h3>
      <p>{text}</p>
    </li>
  );
}

/**
 * The studio before the first video: how a video gets made here, in three
 * steps, with a way to try it straight away.
 */
export function VideoWelcome({ autoplay, onTryExample }: { autoplay: boolean; onTryExample: () => void }) {
  return (
    <div className={styles.welcome}>
      <header className={styles.hero}>
        <h2>
          Direct your next <em>shot.</em>
        </h2>
        <p>From an idea to a finished clip in three steps. Everything you set is on the left.</p>
      </header>

      <ol className={styles.steps}>
        <Step
          number={1}
          title="Add your idea"
          text="Describe the scene, or start from a photo, a movement clip or reference images. Pick how at the top of the panel."
          art={<IdeaArt />}
        />
        <Step
          number={2}
          title="Set up the shot"
          text="Choose a model, then length, shape and sound. The price is always on the Generate button."
          art={<SetupArt />}
        />
        <Step
          number={3}
          title="Get your takes"
          text="Render up to four takes at once and keep the best. Download it, or render it again in 1080p."
          art={<TakesArt autoplay={autoplay} />}
        />
      </ol>

      <button type="button" className={styles.example} onClick={onTryExample}>
        <Sparkles size={14} aria-hidden="true" />
        Not sure where to start? Try an example idea
      </button>
    </div>
  );
}
