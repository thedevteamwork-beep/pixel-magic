"use client";

import { ArrowUpRight, Clock, ImageIcon, Images, PersonStanding, Sparkles, Type } from "lucide-react";
import { useRef, useState } from "react";
import { landingAssets } from "@/constants/landing-media";
import { videoInspirations, videoModes } from "@/components/video-generator/constants";
import type { MediaId } from "@/types/landing";
import type { VideoInspiration, VideoMode } from "@/types/video-generator";
import { Media } from "@/ui/Media";
import styles from "./main.module.css";

function InspirationTile({
  item,
  index,
  autoplay,
  onSelect,
}: {
  item: VideoInspiration;
  index: number;
  autoplay: boolean;
  onSelect: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const asset = landingAssets[item.asset];
  const play = () => {
    if (autoplay)
      video.current
        ?.play()
        .then(() => setPlaying(true))
        .catch(() => {});
  };
  const stop = () => {
    video.current?.pause();
    setPlaying(false);
  };
  return (
    <button
      type="button"
      className={styles.tile}
      data-wide={index === 0}
      data-playing={playing}
      onClick={onSelect}
      onPointerEnter={play}
      onPointerLeave={stop}
      onFocus={play}
      onBlur={stop}
      aria-label={`Use the “${item.title}” shot: ${item.category}, ${item.duration} seconds, ${item.aspectRatio}`}
    >
      <Media
        media={{ kind: "image", src: asset.image, alt: "" }}
        fill
        plain
        eager={index < 2}
        sizes="(max-width: 700px) 90vw, (max-width: 1200px) 45vw, 30vw"
        className={styles.media}
      />
      {asset.video && (
        <video
          ref={video}
          src={asset.video}
          muted
          loop
          playsInline
          preload="none"
          className={styles.media}
          aria-hidden="true"
          tabIndex={-1}
        />
      )}
      <span className={styles.shade} aria-hidden="true" />
      <span className={styles.category}>{item.category}</span>
      <span className={styles.copy}>
        <strong>{item.title}</strong>
        <small>
          <Clock size={11} aria-hidden="true" />
          {item.duration}s · {item.aspectRatio}
        </small>
      </span>
      <span className={styles.arrow} aria-hidden="true">
        <ArrowUpRight size={16} />
      </span>
    </button>
  );
}

const modeArt: Record<VideoMode, { asset: MediaId; icon: typeof Type }> = {
  image: { asset: "product", icon: ImageIcon },
  text: { asset: "desert", icon: Type },
  motion: { asset: "portrait", icon: PersonStanding },
  reference: { asset: "sneakers", icon: Images },
};

export function VideoWelcome({
  autoplay,
  onSelectInspiration,
  onSelectMode,
}: {
  autoplay: boolean;
  onSelectInspiration: (id: string) => void;
  onSelectMode: (mode: VideoMode) => void;
}) {
  return (
    <div className={styles.welcome}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>
          <Sparkles size={12} aria-hidden="true" />
          Video studio
        </p>
        <h2>
          Direct your next <em>shot.</em>
        </h2>
        <p className={styles.lead}>
          Describe a scene, bring a still to life, copy a movement, or keep your characters consistent. Render a few
          takes and keep the best.
        </p>
      </header>

      <section aria-labelledby="video-modes-title">
        <div className={styles.sectionHead}>
          <h3 id="video-modes-title">Choose how to start</h3>
          <span>Each mode shows the models that support it</span>
        </div>
        <div className={styles.modes}>
          {videoModes.map((mode) => {
            const { asset, icon: Icon } = modeArt[mode.id];
            return (
              <button type="button" key={mode.id} className={styles.mode} onClick={() => onSelectMode(mode.id)}>
                <Media
                  media={{ kind: "image", src: landingAssets[asset].image, alt: "" }}
                  fill
                  plain
                  sizes="(max-width: 760px) 45vw, 22vw"
                  className={styles.media}
                />
                <span className={styles.shade} aria-hidden="true" />
                <span className={styles.modeIcon} aria-hidden="true">
                  <Icon size={17} />
                </span>
                {mode.isNew && <span className={styles.newBadge}>New</span>}
                <span className={styles.modeCopy}>
                  <strong>{mode.name}</strong>
                  <small>{mode.description}</small>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="video-inspiration-title">
        <div className={styles.sectionHead}>
          <h3 id="video-inspiration-title">Start from a shot</h3>
          <span>Hover to preview · select to load the prompt and settings</span>
        </div>
        <div className={styles.grid}>
          {videoInspirations.map((item, index) => (
            <InspirationTile
              key={item.id}
              item={item}
              index={index}
              autoplay={autoplay}
              onSelect={() => onSelectInspiration(item.id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
