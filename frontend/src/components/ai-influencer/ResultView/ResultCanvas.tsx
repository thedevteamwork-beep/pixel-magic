import type { CSSProperties } from "react";
import { Media } from "@/ui/Media";
import { GenerationLoader } from "@/ui/GenerationLoader";
import { cssAspectRatio } from "@/helpers/studio";
import { portraitStyle } from "@/lib/ai-influencer/portrait";
import type { InfluencerVariation } from "@/types/ai-influencer";
import styles from "./main.module.css";

type ResultCanvasProps = {
  selected: InfluencerVariation | null;
  busy: boolean;
  name: string;
  /** The ratio picked under the prompt: the frame's shape while a portrait is being made. */
  aspectRatio: string;
};

/** The one portrait on show, in a frame of its shape. While a new one is made, the frame holds the loader instead. */
export function ResultCanvas({ selected, busy, name, aspectRatio }: ResultCanvasProps) {
  if (!selected && !busy) {
    return (
      <div className={styles.canvas}>
        <p className={styles.emptyNote}>No portrait yet. Press Generate to make one.</p>
      </div>
    );
  }
  // A portrait keeps the shape it was made in; one made before shapes were saved uses the picked one.
  const ratio = cssAspectRatio(busy ? aspectRatio : (selected?.aspectRatio ?? aspectRatio));
  return (
    <div className={styles.canvas}>
      <figure className={styles.frame} style={{ "--frame-ratio": ratio } as CSSProperties}>
        {busy ? (
          <>
            <GenerationLoader />
            <div className={styles.busy} role="status">
              <strong>Creating {name}…</strong>
            </div>
          </>
        ) : (
          selected && (
            <>
              <Media
                key={selected.id}
                media={{ kind: "image", src: selected.url, alt: selected.alt }}
                fill
                sizes="(max-width: 900px) 90vw, 520px"
                // Signed storage URLs come from hosts next/image isn't configured for, so they load as they are.
                imageProps={{ preload: true, unoptimized: true, style: portraitStyle(selected) }}
              />
              {selected.sample && <span className={styles.sampleBadge}>Sample</span>}
            </>
          )
        )}
      </figure>
    </div>
  );
}
