import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { StudioCard as StudioCardData } from "@/types/landing";
import { CompareView } from "../CompareView";
import { LandingMedia } from "../LandingMedia";
import { MediaSlideshow } from "../MediaSlideshow";
import styles from "./main.module.css";

const sizes = "(max-width: 720px) 84vw, 36vw";

function CardArtwork({ artwork, priority }: { artwork: StudioCardData["artwork"]; priority: boolean }) {
  switch (artwork.kind) {
    case "slides":
      return (
        <MediaSlideshow slides={artwork.slides} intervalMs={artwork.intervalMs} sizes={sizes} priority={priority} />
      );
    case "clip":
      return <LandingMedia asset={artwork.asset} alt="" behavior="ambient" sizes={sizes} priority={priority} />;
    case "compare":
      return <CompareView before={artwork.asset} after={artwork.asset} softenBefore sizes={sizes} />;
  }
}

type StudioCardProps = {
  card: StudioCardData;
  priority: boolean;
  onOpen: (card: StudioCardData) => void;
};

/** One wide studio card: the picture with its headline, then a bold title and one line under it. */
export function StudioCard({ card, priority, onOpen }: StudioCardProps) {
  return (
    <Link
      href={card.href}
      className={styles.card}
      data-featured={card.featured ?? false}
      onClick={() => onOpen(card)}
      draggable={false}
    >
      <span className={styles.media}>
        <span className={styles.artwork}>
          <CardArtwork artwork={card.artwork} priority={priority} />
        </span>
        {card.badge && (
          <span className={styles.badge} data-tone={card.badge === "New" ? "new" : "plain"}>
            {card.badge}
          </span>
        )}
        <span className={styles.headline} aria-hidden="true">
          {card.headline.title}
          <br />
          <em>{card.headline.accent}</em>
        </span>
        <span className={styles.go} aria-hidden="true">
          <ArrowUpRight size={18} />
        </span>
      </span>
      <span className={styles.title}>{card.title}</span>
      <span className={styles.description}>{card.description}</span>
    </Link>
  );
}
