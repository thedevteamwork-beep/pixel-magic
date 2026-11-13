"use client";

import Image from "next/image";
import { ArrowUpRight, Clapperboard, Film, Layers, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { landingAssets } from "@/constants/landing-media";
import { motionPresets, videoInspirations } from "@/constants/video-generator";
import type { VideoInspiration } from "@/types/video-generator";
import { MotionPreview } from "./MotionPicker";
import styles from "./VideoWelcome.module.css";

const featuredMoves = ["dolly-in", "orbit", "crane-up", "fpv", "crash-zoom", "dolly-zoom"] as const;

function InspirationTile({ item, index, autoplay, onSelect }: { item: VideoInspiration; index: number; autoplay: boolean; onSelect: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const asset = landingAssets[item.asset];
  const motion = motionPresets.find((preset) => preset.id === item.motion);
  const play = () => { if (autoplay) video.current?.play().then(() => setPlaying(true)).catch(() => {}); };
  const stop = () => { video.current?.pause(); setPlaying(false); };
  return <button type="button" className={styles.tile} data-wide={index === 0} data-playing={playing} onClick={onSelect}
    onPointerEnter={play} onPointerLeave={stop} onFocus={play} onBlur={stop} aria-label={`Use the “${item.title}” shot: ${item.category}, ${motion?.name ?? "auto"} camera, ${item.duration} seconds`}>
    <Image src={asset.image} alt="" fill sizes="(max-width: 700px) 90vw, (max-width: 1200px) 45vw, 30vw" className={styles.media} priority={index < 2} />
    {asset.video && <video ref={video} src={asset.video} muted loop playsInline preload="none" className={styles.media} aria-hidden="true" tabIndex={-1} />}
    <span className={styles.shade} aria-hidden="true" />
    <span className={styles.category}>{item.category}</span>
    <span className={styles.copy}>
      <strong>{item.title}</strong>
      <small><Film size={11} aria-hidden="true" />{motion?.name} · {item.duration}s · {item.aspectRatio}</small>
    </span>
    <span className={styles.arrow} aria-hidden="true"><ArrowUpRight size={16} /></span>
  </button>;
}

export function VideoWelcome({ autoplay, onSelectInspiration, onSelectMotion, onStartFromImage }: {
  autoplay: boolean;
  onSelectInspiration: (id: string) => void;
  onSelectMotion: (id: string) => void;
  onStartFromImage: () => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  return <div className={styles.welcome}>
    <header className={styles.hero}>
      <p className={styles.eyebrow}><Sparkles size={12} aria-hidden="true" />Video studio</p>
      <h2>Direct your next <em>shot.</em></h2>
      <p className={styles.lead}>Describe a scene, or bring a still to life. Choose how the camera moves, then render a few takes and keep the best.</p>
      <div className={styles.starts}>
        <span><Clapperboard size={14} aria-hidden="true" />Text to video</span>
        <button type="button" onClick={onStartFromImage}><Layers size={14} aria-hidden="true" />Animate an image<ArrowUpRight size={13} aria-hidden="true" /></button>
      </div>
    </header>

    <section aria-labelledby="video-inspiration-title">
      <div className={styles.sectionHead}><h3 id="video-inspiration-title">Start from a shot</h3><span>Hover to preview · select to load the prompt and settings</span></div>
      <div className={styles.grid}>
        {videoInspirations.map((item, index) => <InspirationTile key={item.id} item={item} index={index} autoplay={autoplay} onSelect={() => onSelectInspiration(item.id)} />)}
      </div>
    </section>

    <section aria-labelledby="video-moves-title">
      <div className={styles.sectionHead}><h3 id="video-moves-title">Try a camera move</h3><span>Pick one to add it to your shot</span></div>
      <div className={styles.moves}>
        {featuredMoves.map((id) => {
          const preset = motionPresets.find((item) => item.id === id)!;
          return <button type="button" key={id} className={styles.move} onClick={() => onSelectMotion(id)}
            onPointerEnter={() => setHovered(id)} onPointerLeave={() => setHovered(null)} onFocus={() => setHovered(id)} onBlur={() => setHovered(null)}>
            <span className={styles.moveMedia}><MotionPreview preset={preset} playing={autoplay && hovered === id} sizes="160px" /></span>
            <strong>{preset.name}</strong>
            <small>{preset.description}</small>
          </button>;
        })}
      </div>
    </section>
  </div>;
}
