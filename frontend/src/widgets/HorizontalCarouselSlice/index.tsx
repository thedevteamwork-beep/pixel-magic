import Link from "next/link";
import { Media, type MediaAsset } from "@/ui/Media";

export type CarouselCard = {
  id: string;
  title: string;
  description: string;
  href: string;
  media: MediaAsset;
};

export type HorizontalCarouselSliceProps = {
  /** Accessible name for the row. */
  label: string;
  items: CarouselCard[];
};

/** Row of large media cards that scrolls sideways; three fit on desktop. */
export function HorizontalCarouselSlice({ label, items }: HorizontalCarouselSliceProps) {
  return (
    <section
      aria-label={label}
      className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 sm:-mx-6 sm:scroll-px-6 sm:px-6"
    >
      {items.map((item, index) => (
        <Link
          key={item.id}
          href={item.href}
          className="group w-[85%] shrink-0 snap-start sm:w-[calc((100%-0.75rem)/2)] lg:w-[calc((100%-1.5rem)/3)]"
        >
          <Media
            media={item.media}
            eager={index === 0}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 85vw"
            className="aspect-video rounded-lg transition-opacity group-hover:opacity-90"
          />
          <h3 className="mt-3 font-display text-sm font-bold uppercase">{item.title}</h3>
          <p className="mt-1 text-sm text-muted">{item.description}</p>
        </Link>
      ))}
    </section>
  );
}
