"use client";

import { Heart } from "lucide-react";
import { useRef, type KeyboardEvent } from "react";
import type { ImageResult } from "@/types/image-generator";
import { Media } from "@/ui/Media";
import { REMOTE_IMAGE } from "../constants";
import styles from "./main.module.css";

type ResultVariationsProps = {
  items: readonly ImageResult[];
  activeId: string;
  onSelect: (id: string) => void;
};

/** The other images of the same generation, as thumbnails. Arrow keys move between them. */
export function ResultVariations({ items, activeId, onSelect }: ResultVariationsProps) {
  const refs = useRef(new Map<string, HTMLButtonElement>());

  function move(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = items.length - 1;
    const next =
      event.key === "ArrowRight"
        ? Math.min(index + 1, last)
        : event.key === "ArrowLeft"
          ? Math.max(index - 1, 0)
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (next === null) return;
    // The stage also listens for arrows; the thumbnails handle their own.
    event.preventDefault();
    event.stopPropagation();
    onSelect(items[next].id);
    refs.current.get(items[next].id)?.focus();
  }

  return (
    <div
      className={styles.variations}
      role="listbox"
      aria-label="Images in this generation"
      aria-orientation="horizontal"
    >
      {items.map((item, index) => {
        const selected = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            role="option"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            ref={(element) => {
              if (element) refs.current.set(item.id, element);
              else refs.current.delete(item.id);
            }}
            className={styles.thumb}
            onClick={() => onSelect(item.id)}
            onKeyDown={(event) => move(event, index)}
            aria-label={`Image ${index + 1} of ${items.length}`}
          >
            <Media media={{ kind: "image", src: item.url, alt: "" }} fill sizes="64px" imageProps={REMOTE_IMAGE} />
            {item.favorite && (
              <span className={styles.thumbFavorite} aria-hidden="true">
                <Heart size={9} fill="currentColor" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
