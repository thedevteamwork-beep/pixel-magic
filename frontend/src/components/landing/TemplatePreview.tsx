"use client";

import { ArrowLeft, ArrowRight, Film, ImageIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { landingAssets } from "@/constants/landing-media";
import type { TemplateItem } from "@/types/landing";
import { LandingMedia } from "./LandingMedia";
import { useLandingMotion } from "./LandingProvider";
import { Modal } from "./Modal";
import styles from "./TemplatePreview.module.css";

type TemplatePreviewProps = {
  item: TemplateItem | null;
  items: readonly TemplateItem[];
  onClose: () => void;
  onSelect: (item: TemplateItem) => void;
};

export function TemplatePreview({ item, items, onClose, onSelect }: TemplatePreviewProps) {
  const { motionEnabled } = useLandingMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const index = item ? items.findIndex((candidate) => candidate.id === item.id) : -1;
  const asset = item ? landingAssets[item.asset] : null;

  useEffect(() => {
    if (!motionEnabled) videoRef.current?.pause();
  }, [motionEnabled, item?.id]);

  useEffect(() => {
    const pauseWhenHidden = () => {
      if (document.hidden) videoRef.current?.pause();
    };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => document.removeEventListener("visibilitychange", pauseWhenHidden);
  }, []);

  return (
    <Modal open={item !== null} onClose={onClose} title={item?.title ?? "Template preview"} className={styles.modal}>
      {item && asset && (
        <>
          <div className={styles.visual}>
            {item.mediaType === "video" && asset.video ? (
              <video
                ref={videoRef}
                className={styles.video}
                key={item.id}
                src={asset.video}
                poster={asset.image}
                style={{ filter: item.filter }}
                controls
                autoPlay={motionEnabled}
                muted
                loop
                playsInline
                preload="metadata"
                aria-label={`${item.title} video preview`}
              />
            ) : (
              <LandingMedia asset={item.asset} alt={`${item.title}: ${item.description}`} behavior="still" filter={item.filter} className={styles.image} sizes="(max-width: 800px) 90vw, 800px" />
            )}
          </div>
          <div className={styles.details}>
            <div>
              <span className={styles.meta}>
                {item.mediaType === "video" ? <Film size={14} /> : <ImageIcon size={14} />}
                {item.model} <span aria-hidden="true">/</span> {item.tag}
              </span>
              <p>{item.description}</p>
            </div>
            {items.length > 1 && (
              <div className={styles.navigation} aria-label="Browse collection previews">
                <button type="button" onClick={() => onSelect(items[index - 1])} disabled={index <= 0} aria-label="Previous template"><ArrowLeft size={17} /></button>
                <span>{index + 1} / {items.length}</span>
                <button type="button" onClick={() => onSelect(items[index + 1])} disabled={index >= items.length - 1} aria-label="Next template"><ArrowRight size={17} /></button>
              </div>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
