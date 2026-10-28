import { cn } from "@/lib/cn";
import { Media, type MediaAsset } from "@/ui/Media";

export type GalleryItem = {
  id: string;
  media: MediaAsset;
  /** CSS aspect ratio, e.g. "3/4". Mixed ratios give the masonry look. */
  aspectRatio: string;
};

type MasonryGridProps = {
  items: GalleryItem[];
  /** Column counts, e.g. "columns-2 md:columns-4". */
  columnsClassName: string;
  sizes?: string;
  className?: string;
};

export function MasonryGrid({ items, columnsClassName, sizes, className }: MasonryGridProps) {
  return (
    <div className={cn("gap-3", columnsClassName, className)}>
      {items.map((item) => (
        <Media
          key={item.id}
          media={item.media}
          sizes={sizes}
          className="mb-3 break-inside-avoid rounded-lg"
          style={{ aspectRatio: item.aspectRatio }}
        />
      ))}
    </div>
  );
}
