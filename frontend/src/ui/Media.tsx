import Image, { type ImageProps } from "next/image";
import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { LazyVideo } from "@/ui/LazyVideo";

export type MediaAsset =
  { kind: "image"; src: string; alt: string } | { kind: "video"; src: string; alt: string; poster?: string };

/** Extra `next/image` options that Media passes straight through (`unoptimized`, `preload`, `style`, `className` …). */
export type MediaImageProps = Omit<ImageProps, "src" | "alt" | "fill" | "sizes">;

type MediaProps = {
  media: MediaAsset;
  /** Fill the nearest positioned parent instead of sizing from `className`/`style`. */
  fill?: boolean;
  /** `next/image` sizes hint. */
  sizes?: string;
  /** Load the image straight away instead of lazily; use only for media visible on first paint. */
  eager?: boolean;
  /** Skip the dark placeholder background, for media layered over something that must show through. */
  plain?: boolean;
  /** Classes and style for the box around the media: position, z-index, transforms, transitions. */
  className?: string;
  style?: CSSProperties;
  /** Options for the image itself: `object-position`, filters, `unoptimized`, `preload`. Ignored for video. */
  imageProps?: MediaImageProps;
};

/**
 * An image or video that covers its box. The box has a surface background,
 * so a missing or slow asset shows as a dark card rather than a hole.
 */
export function Media({ media, fill, sizes = "100vw", eager, plain, className, style, imageProps }: MediaProps) {
  return (
    <div
      className={cn(fill ? "absolute inset-0" : "relative", "overflow-hidden", !plain && "bg-surface", className)}
      style={style}
    >
      {media.kind === "image" ? (
        <Image
          src={media.src}
          alt={media.alt}
          fill
          sizes={sizes}
          loading={eager ? "eager" : undefined}
          {...imageProps}
          className={cn("object-cover", imageProps?.className)}
        />
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
