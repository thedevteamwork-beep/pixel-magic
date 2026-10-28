import { ButtonWithLink, type ActionLink } from "@/ui/Button";
import { MasonryGrid, type GalleryItem } from "@/ui/MasonryGrid";
import { SectionHeading } from "@/ui/SectionHeading";

export type ModelGalleryProps = {
  title: string;
  description: string;
  items: GalleryItem[];
  viewAll?: ActionLink;
};

/** Four-column masonry for one model, cut off with a fade and a "view all" link. */
export function ModelGallery({ title, description, items, viewAll }: ModelGalleryProps) {
  return (
    <section className="flex flex-col gap-4">
      <SectionHeading title={title} description={description} />
      <div className="relative max-h-224 overflow-hidden">
        <MasonryGrid
          items={items}
          columnsClassName="columns-2 md:columns-3 lg:columns-4"
          sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
        />
        {viewAll && (
          <div className="absolute inset-x-0 bottom-0 flex h-40 items-end justify-center bg-linear-to-t from-background to-transparent pb-6">
            <ButtonWithLink href={viewAll.href} variant={viewAll.variant ?? "secondary"}>
              {viewAll.label}
            </ButtonWithLink>
          </div>
        )}
      </div>
    </section>
  );
}
