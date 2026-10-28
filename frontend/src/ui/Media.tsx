import Image from "next/image";
import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { LazyVideo } from "@/ui/LazyVideo";

export type MediaAsset =
  | { kind: "image"; src: string; alt: string }
  | { kind: "video"; src: string; alt: string; poster?: string };

type MediaProps = {
  media: MediaAsset;
  /** Fill the nearest positioned parent instead of sizing from `className`/`style`. */
  fill?: boolean;
  /** `next/image` sizes hint. */
  sizes?: string;
  /** Load the image straight away instead of lazily; use only for media visible on first paint. */
  eager?: boolean;
  className?: string;
  style?: CSSProperties;
};

/**
 * An image or video that covers its box. The box has a surface background,
 * so a missing or slow asset shows as a dark card rather than a hole.
 */
export function Media({ media, fill, sizes = "100vw", eager, className, style }: MediaProps) {
  return (
    <div className={cn(fill ? "absolute inset-0" : "relative", "overflow-hidden bg-surface", className)} style={style}>
      {media.kind === "image" ? (
        <Image src={media.src} alt={media.alt} fill sizes={sizes} loading={eager ? "eager" : undefined} className="object-cover" />
      ) : (
        <LazyVideo
          src={media.src}
          poster={media.poster}
          label={media.alt}
          className="absolute inset-0 size-full object-cover"
        />
      )}
    </div>
  );
}
