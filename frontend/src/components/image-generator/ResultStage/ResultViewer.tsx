"use client";

import { ArrowDownToLine, ChevronLeft, ChevronRight, Heart, Maximize2 } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { downloadResult } from "@/lib/image-generator/download";
import { ratioValue } from "@/lib/image-generator/details";
import type { ImageResult } from "@/types/image-generator";
import { IconButton, iconButtonClasses } from "@/ui/IconButton";
import { Media } from "@/ui/Media";
import { REMOTE_IMAGE } from "../constants";
import styles from "./main.module.css";

type ResultViewerProps = {
  item: ImageResult;
  /** The image's place in its generation, which the arrows step through. */
  position: { index: number; total: number };
  onPrevious: () => void;
  onNext: () => void;
  onFavorite: () => void;
  onExpand: () => void;
};

/** The image at its own shape, over a soft glow of its colors, with its quick actions. */
export function ResultViewer({ item, position, onPrevious, onNext, onFavorite, onExpand }: ResultViewerProps) {
  const many = position.total > 1;
  return (
    <figure className={styles.viewer} aria-label="Selected image">
      <div className={styles.ambient} aria-hidden="true">
        <Media
          media={{ kind: "image", src: item.url, alt: "" }}
          fill
          plain
          eager
          sizes="160px"
          imageProps={REMOTE_IMAGE}
        />
      </div>
      <ViewerImage key={item.id} item={item} onExpand={onExpand} />

      {many && (
        <span className={styles.counter} aria-hidden="true">
          {position.index + 1} / {position.total}
        </span>
      )}
      {many && (
        <>
          <IconButton
            variant="glass"
            size="lg"
            label="Previous image"
            className={`${styles.step} ${styles.stepPrevious}`}
            onClick={onPrevious}
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </IconButton>
          <IconButton
            variant="glass"
            size="lg"
            label="Next image"
            className={`${styles.step} ${styles.stepNext}`}
            onClick={onNext}
          >
            <ChevronRight size={20} aria-hidden="true" />
          </IconButton>
        </>
      )}

      <div className={styles.toolbar} role="toolbar" aria-label="Image actions">
        <IconButton
          variant="onMedia"
          label={item.favorite ? "Remove from favorites" : "Add to favorites"}
          pressed={item.favorite}
          onClick={onFavorite}
        >
          <Heart size={17} fill={item.favorite ? "currentColor" : "none"} aria-hidden="true" />
        </IconButton>
        <a
          href={item.url}
          className={iconButtonClasses({ variant: "onMedia" })}
          aria-label="Download image"
          title="Download image"
          onClick={(event) => {
            // Keeps "open in new tab" working; a click saves the file under a readable name.
            event.preventDefault();
            void downloadResult(item);
          }}
        >
          <ArrowDownToLine size={17} aria-hidden="true" />
        </a>
        <span className={styles.toolbarDivider} aria-hidden="true" />
        <IconButton variant="onMedia" label="View full size" aria-haspopup="dialog" onClick={onExpand}>
          <Maximize2 size={16} aria-hidden="true" />
        </IconButton>
      </div>
    </figure>
  );
}

/** Sized to the image's real shape once it loads; keyed by result, so each image starts from its own ratio. */
function ViewerImage({ item, onExpand }: { item: ImageResult; onExpand: () => void }) {
  const [ratio, setRatio] = useState(() => ratioValue(item.aspectRatio));
  return (
    <button
      type="button"
      className={styles.frame}
      style={{ "--ratio": ratio } as CSSProperties}
      onClick={onExpand}
      aria-label={`View full size: ${item.alt}`}
      aria-haspopup="dialog"
    >
      <Media
        media={{ kind: "image", src: item.url, alt: item.alt }}
        fill
        eager
        sizes="(max-width: 980px) 92vw, 780px"
        imageProps={{
          ...REMOTE_IMAGE,
          onLoad: (event) => {
            const image = event.currentTarget;
            if (image.naturalWidth && image.naturalHeight) setRatio(image.naturalWidth / image.naturalHeight);
          },
        }}
      />
    </button>
  );
}
