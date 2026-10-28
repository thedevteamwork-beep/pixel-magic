import { ButtonWithLink, type ActionLink } from "@/ui/Button";
import { MasonryGrid, type GalleryItem } from "@/ui/MasonryGrid";
import { SectionHeading } from "@/ui/SectionHeading";

export type CommunityGalleryProps = {
  title: string;
  description: string;
  actions: ActionLink[];
  items: GalleryItem[];
};

/** Dense six-column masonry of community work, with CTAs beside the heading. */
export function CommunityGallery({ title, description, actions, items }: CommunityGalleryProps) {
  return (
    <section className="flex flex-col gap-4">
      <SectionHeading
        title={title}
        description={description}
        actions={actions.map((action, index) => (
          <ButtonWithLink key={action.label} href={action.href} variant={action.variant ?? (index === 0 ? "primary" : "secondary")}>
            {action.label}
          </ButtonWithLink>
        ))}
      />
      <MasonryGrid
        items={items}
        columnsClassName="columns-2 md:columns-4 lg:columns-6"
        sizes="(min-width: 1024px) 17vw, (min-width: 768px) 25vw, 50vw"
      />
    </section>
  );
}
